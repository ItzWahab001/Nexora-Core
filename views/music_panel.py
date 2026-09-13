"""
Live 'Now Playing' panel. Every button re-renders the embed/view in place
via `interaction.response.edit_message`, so the panel always reflects
current playback/queue/loop state without the user needing to re-run a
command.
"""

from __future__ import annotations

import discord

from services.music_service import music_service
from utils.embeds import base_embed, error_embed
from utils.helpers import format_seconds, progress_bar
from views.common import PanelView


def _build_embed(bot, guild_id: int) -> discord.Embed:
    state = music_service.get_state(guild_id)
    if not state.current:
        embed = base_embed("🎵 Now Playing", "Nothing is currently playing. Use `/play <song>` to start.")
        return embed

    track = state.current
    embed = base_embed("🎵 Now Playing")
    embed.add_field(name="Song", value=f"[{track.title}]({track.url})", inline=False)
    if track.duration:
        embed.add_field(name="Duration", value=format_seconds(track.duration), inline=True)
    embed.add_field(name="Requested by", value=f"<@{track.requested_by}>", inline=True)
    embed.add_field(name="Volume", value=f"{int(state.volume * 100)}%", inline=True)
    embed.add_field(name="Loop", value="🔁 On" if state.loop else "Off", inline=True)
    embed.add_field(name="Queue", value=f"{len(state.queue)} track(s)", inline=True)
    status = "⏸️ Paused" if state.is_paused() else ("▶️ Playing" if state.is_playing() else "⏹️ Stopped")
    embed.add_field(name="Status", value=status, inline=True)
    if track.thumbnail:
        embed.set_thumbnail(url=track.thumbnail)
    embed.description = progress_bar(1, 1) if state.is_playing() else None
    return embed


def build_music_panel(bot, guild_id: int, author_id: int):
    from views.main_menu import build_main_menu

    embed = _build_embed(bot, guild_id)
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_item(PlayPauseButton(guild_id))
    view.add_item(SkipButton(guild_id))
    view.add_item(StopButton(guild_id))
    view.add_item(LoopButton(guild_id))
    view.add_item(ShuffleButton(guild_id))
    view.add_item(QueueButton(guild_id))
    view.add_nav_row(show_back=True)
    return embed, view


class _RefreshingButton(discord.ui.Button):
    async def refresh(self, interaction: discord.Interaction) -> None:
        view: PanelView = self.view  # type: ignore[assignment]
        embed = _build_embed(interaction.client, interaction.guild_id)
        await interaction.response.edit_message(embed=embed, view=view)


class PlayPauseButton(_RefreshingButton):
    def __init__(self, guild_id: int) -> None:
        super().__init__(label="Play/Pause", emoji="⏯️", style=discord.ButtonStyle.primary, row=0)
        self.guild_id = guild_id

    async def callback(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(self.guild_id)
        if state.is_playing():
            music_service.pause(state)
        elif state.is_paused():
            music_service.resume(state)
        await self.refresh(interaction)


class SkipButton(_RefreshingButton):
    def __init__(self, guild_id: int) -> None:
        super().__init__(label="Skip", emoji="⏭️", style=discord.ButtonStyle.secondary, row=0)
        self.guild_id = guild_id

    async def callback(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(self.guild_id)
        music_service.skip(state)
        await self.refresh(interaction)


class StopButton(_RefreshingButton):
    def __init__(self, guild_id: int) -> None:
        super().__init__(label="Stop", emoji="⏹️", style=discord.ButtonStyle.danger, row=0)
        self.guild_id = guild_id

    async def callback(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(self.guild_id)
        music_service.stop(state)
        await self.refresh(interaction)


class LoopButton(_RefreshingButton):
    def __init__(self, guild_id: int) -> None:
        super().__init__(label="Loop", emoji="🔁", style=discord.ButtonStyle.secondary, row=1)
        self.guild_id = guild_id

    async def callback(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(self.guild_id)
        state.loop = not state.loop
        await self.refresh(interaction)


class ShuffleButton(_RefreshingButton):
    def __init__(self, guild_id: int) -> None:
        super().__init__(label="Shuffle", emoji="🔀", style=discord.ButtonStyle.secondary, row=1)
        self.guild_id = guild_id

    async def callback(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(self.guild_id)
        music_service.shuffle_queue(state)
        await self.refresh(interaction)


class QueueButton(discord.ui.Button):
    def __init__(self, guild_id: int) -> None:
        super().__init__(label="Queue", emoji="📜", style=discord.ButtonStyle.secondary, row=1)
        self.guild_id = guild_id

    async def callback(self, interaction: discord.Interaction) -> None:
        state = music_service.get_state(self.guild_id)
        if not state.queue:
            await interaction.response.send_message(embed=error_embed("Queue Empty"), ephemeral=True)
            return
        lines = [f"{i}. {t.title}" for i, t in enumerate(state.queue[:15], start=1)]
        await interaction.response.send_message("\n".join(lines), ephemeral=True)
