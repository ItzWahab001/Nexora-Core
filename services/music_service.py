"""
Reliable music playback for discord.py using yt-dlp + FFmpeg.

The host must provide FFmpeg. YouTube extraction also needs yt-dlp's EJS
support and a JavaScript runtime (Deno is used by the included Dockerfile).
"""

from __future__ import annotations

import asyncio
import logging
import os
import random
import shutil
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional

import discord
import yt_dlp

log = logging.getLogger("bot.services.music")

YTDL_OPTIONS = {
    "format": "bestaudio[ext=webm]/bestaudio/best",
    "noplaylist": True,
    "quiet": True,
    "no_warnings": True,
    "default_search": "ytsearch1",
    "js_runtimes": ["node"],
    "source_address": "0.0.0.0",
    "socket_timeout": 15,
    "extractor_retries": 3,
    "retries": 3,
    "fragment_retries": 3,
    "skip_unavailable_fragments": True,
}

FFMPEG_OPTIONS = {
    "before_options": (
        "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 "
        "-nostdin"
    ),
    "options": "-vn",
}


def _ffmpeg_executable() -> str:
    configured = os.getenv("FFMPEG_PATH", "").strip()
    path = configured or shutil.which("ffmpeg")
    if not path:
        raise RuntimeError(
            "FFmpeg is not installed or not on PATH. Install the FFmpeg binary "
            "on the bot host (or set FFMPEG_PATH)."
        )
    return path


@dataclass
class Track:
    title: str
    url: str
    stream_url: str
    thumbnail: Optional[str]
    duration: Optional[int]
    requested_by: int


@dataclass
class GuildMusicState:
    guild_id: int
    voice_client: Optional[discord.VoiceClient] = None
    queue: list[Track] = field(default_factory=list)
    current: Optional[Track] = None
    volume: float = 0.5
    loop: bool = False
    text_channel_id: Optional[int] = None
    on_track_end: Optional[Callable[[], Awaitable[None]]] = None
    event_loop: Optional[asyncio.AbstractEventLoop] = None

    def is_playing(self) -> bool:
        return bool(self.voice_client and self.voice_client.is_playing())

    def is_paused(self) -> bool:
        return bool(self.voice_client and self.voice_client.is_paused())


async def resolve_track(query: str, requested_by: int) -> Track:
    """Resolve a search term or URL into a playable Track via yt-dlp."""
    loop = asyncio.get_running_loop()

    def _extract() -> dict:
        with yt_dlp.YoutubeDL(YTDL_OPTIONS) as ytdl:
            info = ytdl.extract_info(query, download=False)

        if not info:
            raise RuntimeError("yt-dlp returned no result.")

        if "entries" in info:
            entries = [entry for entry in (info.get("entries") or []) if entry]
            if not entries:
                raise RuntimeError("No playable result was found for that search.")
            info = entries[0]

        return info

    info = await loop.run_in_executor(None, _extract)

    stream_url = info.get("url")
    if not stream_url:
        raise RuntimeError("The extractor found the track but returned no audio stream.")

    return Track(
        title=info.get("title", "Unknown Title"),
        url=info.get("webpage_url") or query,
        stream_url=stream_url,
        thumbnail=info.get("thumbnail"),
        duration=info.get("duration"),
        requested_by=requested_by,
    )


class MusicService:
    def __init__(self) -> None:
        self._states: dict[int, GuildMusicState] = {}

    def get_state(self, guild_id: int) -> GuildMusicState:
        if guild_id not in self._states:
            self._states[guild_id] = GuildMusicState(guild_id=guild_id)
        return self._states[guild_id]

    def drop_state(self, guild_id: int) -> None:
        self._states.pop(guild_id, None)

    async def connect(self, channel: discord.VoiceChannel) -> GuildMusicState:
        _ffmpeg_executable()
        state = self.get_state(channel.guild.id)
        state.event_loop = asyncio.get_running_loop()

        if state.voice_client and state.voice_client.is_connected():
            if state.voice_client.channel and state.voice_client.channel.id != channel.id:
                await state.voice_client.move_to(channel)
        else:
            state.voice_client = await channel.connect(timeout=12, reconnect=True)

        return state

    async def disconnect(self, guild_id: int) -> None:
        state = self.get_state(guild_id)
        if state.voice_client:
            await state.voice_client.disconnect(force=True)
        self.drop_state(guild_id)

    def _play_next_sync(self, guild_id: int, error: Exception | None) -> None:
        # discord.py calls `after` from its audio thread, so use the loop
        # captured during voice connection instead of get_event_loop().
        if error:
            log.error("Playback error in guild %s: %s", guild_id, error)

        state = self.get_state(guild_id)
        callback = state.on_track_end
        loop = state.event_loop

        if callback is None or loop is None or loop.is_closed():
            return

        future = asyncio.run_coroutine_threadsafe(callback(), loop)
        future.add_done_callback(self._log_callback_result)

    @staticmethod
    def _log_callback_result(future) -> None:
        try:
            future.result()
        except Exception:
            log.exception("Error advancing the music queue")

    def play_track(self, state: GuildMusicState, track: Track) -> None:
        if not state.voice_client or not state.voice_client.is_connected():
            raise RuntimeError("The bot is not connected to a voice channel.")

        ffmpeg = _ffmpeg_executable()
        source = discord.FFmpegPCMAudio(
            track.stream_url,
            executable=ffmpeg,
            **FFMPEG_OPTIONS,
        )
        source = discord.PCMVolumeTransformer(source, volume=state.volume)
        state.current = track

        try:
            state.voice_client.play(
                source,
                after=lambda error: self._play_next_sync(state.guild_id, error),
            )
        except Exception:
            state.current = None
            source.cleanup()
            raise

    def pause(self, state: GuildMusicState) -> bool:
        if state.is_playing():
            state.voice_client.pause()
            return True
        return False

    def resume(self, state: GuildMusicState) -> bool:
        if state.is_paused():
            state.voice_client.resume()
            return True
        return False

    def skip(self, state: GuildMusicState) -> bool:
        if state.voice_client and (state.is_playing() or state.is_paused()):
            state.voice_client.stop()
            return True
        return False

    def stop(self, state: GuildMusicState) -> None:
        state.queue.clear()
        state.current = None
        if state.voice_client and (state.voice_client.is_playing() or state.voice_client.is_paused()):
            state.voice_client.stop()

    def set_volume(self, state: GuildMusicState, volume: float) -> None:
        state.volume = max(0.0, min(volume, 2.0))
        if state.voice_client and isinstance(
            state.voice_client.source, discord.PCMVolumeTransformer
        ):
            state.voice_client.source.volume = state.volume

    def shuffle_queue(self, state: GuildMusicState) -> None:
        random.shuffle(state.queue)

    def clear_queue(self, state: GuildMusicState) -> None:
        state.queue.clear()

    def remove_from_queue(self, state: GuildMusicState, index: int) -> Optional[Track]:
        if 0 <= index < len(state.queue):
            return state.queue.pop(index)
        return None


music_service = MusicService()
