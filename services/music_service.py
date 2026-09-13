"""
Music playback abstraction built on discord.py voice + yt-dlp.

Requirements on the host machine: an `ffmpeg` binary on PATH (used by
discord.FFmpegPCMAudio to transcode the audio stream yt-dlp resolves).

Design: one `GuildMusicState` per guild holds the voice client, queue and
now-playing metadata. `MusicService` is a thin registry mapping guild_id ->
GuildMusicState so cogs/views never manage voice clients directly. This
keeps cogs/music.py and views/music_panel.py free of playback internals --
they only ever call `music_service.get_state(guild_id)` and use its methods.
"""

from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional

import discord
import yt_dlp

log = logging.getLogger("bot.services.music")

YTDL_OPTIONS = {
    "format": "bestaudio/best",
    "noplaylist": True,
    "quiet": True,
    "no_warnings": True,
    "default_search": "ytsearch",
    "source_address": "0.0.0.0",
    # Without these, a stalled network request to YouTube (common on some cloud
    # hosts / when YouTube throttles a datacenter IP) hangs forever instead of
    # raising an error -- which is what made /play get stuck on "thinking...".
    "socket_timeout": 10,
    "extractor_retries": 2,
}

FFMPEG_OPTIONS = {
    "before_options": "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
    "options": "-vn",
}

_ytdl = yt_dlp.YoutubeDL(YTDL_OPTIONS)


@dataclass
class Track:
    title: str
    url: str  # webpage url (for display)
    stream_url: str  # direct resolved audio stream url
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

    def is_playing(self) -> bool:
        return bool(self.voice_client and self.voice_client.is_playing())

    def is_paused(self) -> bool:
        return bool(self.voice_client and self.voice_client.is_paused())


async def resolve_track(query: str, requested_by: int) -> Track:
    """Resolves a search term or URL into a playable Track via yt-dlp."""
    loop = asyncio.get_running_loop()

    def _extract():
        info = _ytdl.extract_info(query, download=False)
        if "entries" in info:
            info = info["entries"][0]
        return info

    info = await loop.run_in_executor(None, _extract)
    return Track(
        title=info.get("title", "Unknown Title"),
        url=info.get("webpage_url", query),
        stream_url=info["url"],
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
        state = self.get_state(channel.guild.id)
        if state.voice_client and state.voice_client.is_connected():
            if state.voice_client.channel.id != channel.id:
                await state.voice_client.move_to(channel)
        else:
            state.voice_client = await channel.connect()
        return state

    async def disconnect(self, guild_id: int) -> None:
        state = self.get_state(guild_id)
        if state.voice_client:
            await state.voice_client.disconnect(force=True)
        self.drop_state(guild_id)

    def _play_next_sync(self, guild_id: int, error: Exception | None) -> None:
        # Called by discord.py from a non-async thread when a track finishes.
        if error:
            log.error("Playback error in guild %s: %s", guild_id, error)
        state = self.get_state(guild_id)
        if state.on_track_end is not None:
            fut = asyncio.run_coroutine_threadsafe(
                state.on_track_end(), asyncio.get_event_loop()
            )
            try:
                fut.result()
            except Exception:
                log.exception("Error running on_track_end callback")

    def play_track(self, state: GuildMusicState, track: Track) -> None:
        if not state.voice_client:
            raise RuntimeError("Not connected to a voice channel.")
        source = discord.FFmpegPCMAudio(track.stream_url, **FFMPEG_OPTIONS)
        source = discord.PCMVolumeTransformer(source, volume=state.volume)
        state.current = track
        state.voice_client.play(
            source, after=lambda e: self._play_next_sync(state.guild_id, e)
        )

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
            state.voice_client.stop()  # triggers 'after' callback -> plays next
            return True
        return False

    def stop(self, state: GuildMusicState) -> None:
        state.queue.clear()
        state.current = None
        if state.voice_client:
            state.voice_client.stop()

    def set_volume(self, state: GuildMusicState, volume: float) -> None:
        state.volume = max(0.0, min(volume, 2.0))
        if state.voice_client and isinstance(state.voice_client.source, discord.PCMVolumeTransformer):
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
