"""Admin-facing 'Tickets' panel opened from /menu -> 🎫 Tickets."""

from __future__ import annotations

import discord

from utils.embeds import base_embed
from views.common import PanelView


def build_ticket_admin_panel_sync(guild: discord.Guild, open_count: int, author_id: int):
    from views.main_menu import build_main_menu

    embed = base_embed(
        "🎫 Ticket Management",
        "Manage the ticket system for this server.\nUse `/ticket setup` to post a new panel, "
        "or `/ticket add_category` to add categories to an existing one.",
    )
    embed.add_field(name="Open Tickets", value=str(open_count), inline=True)
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_item(OpenTicketsButton(guild.id))
    view.add_nav_row(show_back=True)
    return embed, view


async def build_ticket_admin_panel(bot, guild: discord.Guild, author_id: int):
    open_tickets = await bot.db.open_tickets_for_guild(guild.id)
    return build_ticket_admin_panel_sync(guild, len(open_tickets), author_id)


class OpenTicketsButton(discord.ui.Button):
    def __init__(self, guild_id: int) -> None:
        super().__init__(label="List Open Tickets", emoji="📋", style=discord.ButtonStyle.primary, row=0)
        self.guild_id = guild_id

    async def callback(self, interaction: discord.Interaction) -> None:
        rows = await interaction.client.db.open_tickets_for_guild(self.guild_id)
        if not rows:
            await interaction.response.send_message("No open tickets.", ephemeral=True)
            return
        lines = [f"<#{r['channel_id']}> — opened by <@{r['owner_id']}> ({r['category_label'] or 'General'})" for r in rows]
        await interaction.response.send_message("\n".join(lines[:25]), ephemeral=True)
