"""AI Center panel opened from /menu -> 🤖 AI Chat."""

from __future__ import annotations

import discord

from utils.embeds import base_embed
from views.common import PanelView


async def build_ai_panel(bot, guild_id: int, author_id: int):
    from views.main_menu import build_main_menu

    settings = await bot.db.get_ai_settings(guild_id)
    status = "Enabled ✅" if settings and settings["enabled"] else "Disabled ❌"
    channel = f"<#{settings['channel_id']}>" if settings and settings["channel_id"] else "Not set"

    embed = base_embed("🤖 AI Center", "Chat with the AI or manage its settings.")
    embed.add_field(name="Status", value=status, inline=True)
    embed.add_field(name="Dedicated Channel", value=channel, inline=True)
    embed.add_field(
        name="Commands",
        value="`/ai <message>` — ask anything\n`/ai reset` — clear your conversation\n"
        "`/ai enable` / `/ai disable` — admin toggle\n`/ai channel` — set auto-reply channel",
        inline=False,
    )

    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_item(ResetChatButton())
    view.add_nav_row(show_back=False)
    return embed, view


class ResetChatButton(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Reset My Chat", emoji="🔄", style=discord.ButtonStyle.secondary, row=0)

    async def callback(self, interaction: discord.Interaction) -> None:
        await interaction.client.db.reset_ai_history(interaction.guild_id, interaction.user.id)
        await interaction.response.send_message(content="✅ Your AI conversation has been reset.", ephemeral=True)
