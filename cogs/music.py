import asyncio
import logging
import shutil
from collections import deque
from dataclasses import dataclass

import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.embeds import success_embed, error_embed, panel_embed
from views.music_views import MusicControlView

logger = logging.getLogger("cogs.music")

YTDL_OPTS = {
    "format": "bestaudio/best",
    "noplaylist": True,
    "quiet": True,
    "default_search": "ytsearch",
    "source_address": "0.0.0.0",
}
FFMPEG_OPTS = {
    "before_options": "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
    "options": "-vn",
}


@dataclass
class Track:
    title: str
    url: str
    stream_url: str
    requester_id: int
    duration: int = 0


class GuildMusicState:
    def __init__(self):
        self.queue: deque[Track] = deque()
        self.current: Track | None = None
        self.voice_client: discord.VoiceClient | None = None
        self.loop = False
        self.volume = 0.5
        self.text_channel: discord.TextChannel | None = None


class Music(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db
        self._states: dict[int, GuildMusicState] = {}

    def _state(self, guild: discord.Guild) -> GuildMusicState:
        if guild.id not in self._states:
            self._states[guild.id] = GuildMusicState()
        return self._states[guild.id]

    async def _extract(self, query: str) -> Track | None:
        if shutil.which("ffmpeg") is None:
            logger.error("FFmpeg is not installed or not on PATH")
            return None
        try:
            import yt_dlp
        except ImportError:
            logger.error("yt-dlp is not installed")
            return None

        loop = asyncio.get_running_loop()

        def _run():
            with yt_dlp.YoutubeDL(YTDL_OPTS) as ydl:
                info = ydl.extract_info(query, download=False)
                if "entries" in info:
                    info = info["entries"][0]
                return info

        try:
            info = await loop.run_in_executor(None, _run)
        except Exception:
            logger.exception("yt-dlp extraction failed")
            return None
        return Track(title=info.get("title", "Unknown"), url=info.get("webpage_url", query),
                     stream_url=info["url"], requester_id=0, duration=info.get("duration", 0))

    def _play_next(self, guild: discord.Guild):
        state = self._state(guild)
        if state.loop and state.current:
            state.queue.appendleft(state.current)
        if not state.queue:
            state.current = None
            return
        track = state.queue.popleft()
        state.current = track
        source = discord.PCMVolumeTransformer(
            discord.FFmpegPCMAudio(track.stream_url, **FFMPEG_OPTS), volume=state.volume
        )

        def _after(err):
            if err:
                logger.error("Music playback error: %s", err)
            self.bot.loop.call_soon_threadsafe(self._play_next, guild)

        if state.voice_client and state.voice_client.is_connected():
            state.voice_client.play(source, after=_after)
            if state.text_channel:
                asyncio.run_coroutine_threadsafe(
                    state.text_channel.send(
                        embed=panel_embed("🎵 Now Playing", track.title),
                        view=MusicControlView(self.bot, guild.id),
                    ),
                    self.bot.loop,
                )

    @app_commands.command(name="play", description="Play a song by URL or search term")
    async def play(self, interaction: discord.Interaction, query: str):
        if not isinstance(interaction.user, discord.Member) or interaction.user.voice is None:
            await interaction.response.send_message(embed=error_embed("Join a voice channel first"), ephemeral=True)
            return
        await interaction.response.defer()
        state = self._state(interaction.guild)
        state.text_channel = interaction.channel

        if shutil.which("ffmpeg") is None:
            await interaction.followup.send(embed=error_embed("FFmpeg missing", "Music playback needs FFmpeg on the Railway server."))
            return

        if state.voice_client is None or not state.voice_client.is_connected():
            try:
                state.voice_client = await interaction.user.voice.channel.connect(reconnect=True)
            except (discord.Forbidden, discord.ClientException) as e:
                logger.exception("Voice connection failed")
                await interaction.followup.send(embed=error_embed("Voice connection failed", str(e)[:1000]))
                return

        track = await self._extract(query)
        if track is None:
            await interaction.followup.send(embed=error_embed("Playback failed", "Couldn't find or stream that track."))
            return
        track.requester_id = interaction.user.id
        state.queue.append(track)
        await interaction.followup.send(embed=success_embed("Queued", track.title))

        if not state.voice_client.is_playing() and not state.voice_client.is_paused():
            try:
                self._play_next(interaction.guild)
            except (discord.ClientException, FileNotFoundError, OSError) as e:
                logger.exception("Could not start FFmpeg playback")
                await interaction.followup.send(embed=error_embed("Playback failed", f"FFmpeg could not start: {e}"))

    async def pause(self, guild: discord.Guild) -> bool:
        state = self._state(guild)
        if state.voice_client and state.voice_client.is_playing():
            state.voice_client.pause()
            return True
        return False

    async def resume(self, guild: discord.Guild) -> bool:
        state = self._state(guild)
        if state.voice_client and state.voice_client.is_paused():
            state.voice_client.resume()
            return True
        return False

    async def skip(self, guild: discord.Guild) -> bool:
        state = self._state(guild)
        if state.voice_client and (state.voice_client.is_playing() or state.voice_client.is_paused()):
            state.voice_client.stop()  # triggers _after -> _play_next
            return True
        return False

    async def stop(self, guild: discord.Guild):
        state = self._state(guild)
        state.queue.clear()
        state.loop = False
        if state.voice_client:
            state.voice_client.stop()
            await state.voice_client.disconnect(force=False)
            state.voice_client = None

    async def toggle_loop(self, guild: discord.Guild) -> bool:
        state = self._state(guild)
        state.loop = not state.loop
        return state.loop

    def queue_text(self, guild: discord.Guild) -> str:
        state = self._state(guild)
        if not state.queue and not state.current:
            return "The queue is empty."
        lines = [f"**Now Playing:** {state.current.title}"] if state.current else []
        lines += [f"{i+1}. {t.title}" for i, t in enumerate(state.queue)]
        return "\n".join(lines)[:1900]

    @app_commands.command(name="skip", description="Skip the current song")
    async def skip_cmd(self, interaction: discord.Interaction):
        ok = await self.skip(interaction.guild)
        await interaction.response.send_message("Skipped." if ok else "Nothing playing.", ephemeral=True)

    @app_commands.command(name="stop", description="Stop playback and clear the queue")
    async def stop_cmd(self, interaction: discord.Interaction):
        await self.stop(interaction.guild)
        await interaction.response.send_message("Stopped.", ephemeral=True)

    @app_commands.command(name="queue", description="Show the current queue")
    async def queue_cmd(self, interaction: discord.Interaction):
        await interaction.response.send_message(self.queue_text(interaction.guild), ephemeral=True)

    @app_commands.command(name="volume", description="Set playback volume (0-100)")
    async def volume_cmd(self, interaction: discord.Interaction, level: app_commands.Range[int, 0, 100]):
        state = self._state(interaction.guild)
        state.volume = level / 100
        if state.voice_client and isinstance(state.voice_client.source, discord.PCMVolumeTransformer):
            state.voice_client.source.volume = state.volume
        await interaction.response.send_message(f"Volume set to {level}%.", ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Music(bot))
