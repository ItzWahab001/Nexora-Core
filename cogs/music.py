"""
Music system: slash commands + a live Now Playing panel (views/music_panel.py).
Uses services/music_service.py for all voice/queue logic so this file stays
focused on Discord-facing commands and permission checks.
"""

from __future__ import annotations

import asyncio

import discord
from discord import app_commands
from discord.ext import commands

from services.music_service import Track, music_service, resolve_track
from utils.embeds import error_embed, success_embed
from utils.logger import logger


async def _ensure_voice(interaction: discord.Interaction) -> discord.VoiceChannel | None:
    member = interaction.user
    if not isinstance(member, discord.Member) or member.voice is None or member.voice.channel is None:
        await interaction.response.send_message(
            embed=error_embed("Join a Voice Channel", "You must be in a voice channel to use music commands."),
            ephemeral=True,
        )
        return None
    return member.voice.channel


class Music(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="play", description="Play a song or add it to the queue")
    @app_commands.describe(query="A song name, artist, or URL")
    async def play(self, interaction: discord.Interaction, query: str) -> None:
        channel = await _ensure_voice(interaction)
        if channel is None:
            return
        await interaction.response.defer(thinking=True)

        try:
            track = await asyncio.wait_for(resolve_track(query, interaction.user.id), timeout=30)
        except asyncio.TimeoutError:
            await interaction.followup.send(embed=error_embed(
                "Search Timed Out",
                "YouTube/media search took too long. Try a direct URL or a shorter search.",
            ))
            return
        except Exception as exc:
            logger.exception("Failed to resolve track")
            await interaction.followup.send(embed=error_embed("Playback Error", f"Couldn't find that track: {exc}"))
            return

        try:
            state = await asyncio.wait_for(music_service.connect(channel), timeout=20)
        except asyncio.TimeoutError:
            await interaction.followup.send(embed=error_embed(
                "Voice Connection Timed Out",
                "Discord voice connection timed out. The host must allow outbound UDP voice traffic.",
            ))
            return
        except discord.ClientException as exc:
            await interaction.followup.send(embed=error_embed("Couldn't Join Voice", str(exc)))
            return
        except Exception as exc:
            logger.exception("Voice connection failed")
            await interaction.followup.send(embed=error_embed("Music Setup Error", str(exc)))
            return

        state.text_channel_id = interaction.channel_id
        if state.on_track_end is None:
            async def on_track_end() -> None:
                await self._advance_queue(interaction.guild_id)
            state.on_track_end = on_track_end

        if state.is_playing() or state.is_paused():
            state.queue.append(track)
            await interaction.followup.send(embed=success_embed("Added to Queue", f"**{track.title}** — position #{len(state.queue)}"))
            return

        try:
            music_service.play_track(state, track)
        except Exception as exc:
            logger.exception("Failed to start FFmpeg playback")
            await interaction.followup.send(embed=error_embed("Playback Start Failed", str(exc)))
            return
        await interaction.followup.send(embed=success_embed("Now Playing", f"**{track.title}**"))

    async def _advance_queue(self, guild_id: int) -> None:
        state = music_service.get_state(guild_id)
        if state.loop and state.current:
            current = state.current
            try:
                refreshed = await asyncio.wait_for(resolve_track(current.url, current.requested_by), timeout=30)
                music_service.play_track(state, refreshed)
            except Exception:
                logger.exception("Failed to replay looped track")
            return

        if not state.queue:
            state.current = None
            return

        next_track = state.queue.pop(0)
        try:
            # Stream URLs can expire; refresh from the original page/search URL.
            refreshed = await asyncio.wait_for(resolve_track(next_track.url, next_track.requested_by), timeout=30)
            music_service.play_track(state, refreshed)
        except Exception:
            logger.exception("Failed to start next queued track")
            await self._advance_queue(guild_id)

    @app_commands.command(name="pause", description="Pause the current track")
    async def pause(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(interaction.guild_id)
        ok = music_service.pause(state)
        await interaction.response.send_message(
            embed=success_embed("Paused") if ok else error_embed("Nothing Playing"), ephemeral=not ok
        )

    @app_commands.command(name="resume", description="Resume playback")
    async def resume(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(interaction.guild_id)
        ok = music_service.resume(state)
        await interaction.response.send_message(
            embed=success_embed("Resumed") if ok else error_embed("Nothing Paused"), ephemeral=not ok
        )

    @app_commands.command(name="skip", description="Skip the current track")
    async def skip(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(interaction.guild_id)
        ok = music_service.skip(state)
        await interaction.response.send_message(
            embed=success_embed("Skipped") if ok else error_embed("Nothing Playing"), ephemeral=not ok
        )

    @app_commands.command(name="stop", description="Stop playback and clear the queue")
    async def stop(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(interaction.guild_id)
        music_service.stop(state)
        await interaction.response.send_message(embed=success_embed("Stopped", "Queue cleared."))

    @app_commands.command(name="queue", description="Show the current queue")
    async def queue(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(interaction.guild_id)
        if not state.queue and not state.current:
            await interaction.response.send_message(embed=error_embed("Queue Empty"), ephemeral=True)
            return
        lines = []
        if state.current:
            lines.append(f"▶️ **Now Playing:** {state.current.title}")
        for i, t in enumerate(state.queue[:15], start=1):
            lines.append(f"{i}. {t.title}")
        await interaction.response.send_message("\n".join(lines))

    @app_commands.command(name="nowplaying", description="Show the currently playing track")
    async def nowplaying(self, interaction: discord.Interaction) -> None:
        from views.music_panel import build_music_panel

        embed, view = build_music_panel(self.bot, interaction.guild_id, interaction.user.id)
        await interaction.response.send_message(embed=embed, view=view)
        view.message = await interaction.original_response()

    @app_commands.command(name="volume", description="Set playback volume (0-200%)")
    async def volume(self, interaction: discord.Interaction, percent: app_commands.Range[int, 0, 200]) -> None:
        state = music_service.get_state(interaction.guild_id)
        music_service.set_volume(state, percent / 100)
        await interaction.response.send_message(embed=success_embed("Volume Set", f"{percent}%"))

    @app_commands.command(name="loop", description="Toggle looping the current track")
    async def loop(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(interaction.guild_id)
        state.loop = not state.loop
        await interaction.response.send_message(embed=success_embed("Loop " + ("Enabled" if state.loop else "Disabled")))

    @app_commands.command(name="shuffle", description="Shuffle the queue")
    async def shuffle(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(interaction.guild_id)
        music_service.shuffle_queue(state)
        await interaction.response.send_message(embed=success_embed("Queue Shuffled"))

    @app_commands.command(name="remove", description="Remove a track from the queue by position")
    async def remove(self, interaction: discord.Interaction, position: int) -> None:
        state = music_service.get_state(interaction.guild_id)
        track = music_service.remove_from_queue(state, position - 1)
        if track:
            await interaction.response.send_message(embed=success_embed("Removed", track.title))
        else:
            await interaction.response.send_message(embed=error_embed("Invalid Position"), ephemeral=True)

    @app_commands.command(name="clearqueue", description="Clear the music queue")
    async def clear(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(interaction.guild_id)
        music_service.clear_queue(state)
        await interaction.response.send_message(embed=success_embed("Queue Cleared"))

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState) -> None:
        if member.id != self.bot.user.id:
            return
        # Bot was disconnected/kicked from voice -- clean up state.
        if before.channel is not None and after.channel is None:
            music_service.drop_state(member.guild.id)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Music(bot))
