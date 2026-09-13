"""Admin Control Center: top-level links into every feature's own config panel."""

from __future__ import annotations

import discord

from utils.embeds import base_embed
from views.common import PanelView


def build_admin_panel(author_id: int):
    from views.main_menu import build_main_menu

    embed = base_embed(
        "🔐 Admin Control Center",
        "Configuration for every system lives in its own panel from `/menu`. "
        "This screen is a shortcut back to each one.",
    )
    embed.add_field(
        name="Systems",
        value=(
            "🤖 AI Settings — `/ai setup`\n🎵 Music Settings — `/volume`, `/loop`\n"
            "🎫 Ticket Settings — `/ticket config`\n🎉 Giveaway Settings — `/giveaway start`\n"
            "🛡️ Moderation — `/ban`, `/warn`\n🚨 AutoMod — `/automod config`\n"
            "✅ Verification — `/verify setup`\n👋 Welcome — `/welcome setup`\n"
            "🎭 Auto Role — `/autorole add`\n📋 Logging — `/logs setup`\n"
            "⚙️ Custom Commands — `/custom create`"
        ),
        inline=False,
    )
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_item(BackToMenuSelect())
    view.add_nav_row(show_back=False)
    return embed, view


class BackToMenuSelect(discord.ui.Select):
    def __init__(self) -> None:
        from views.main_menu import FEATURES

        options = [
            discord.SelectOption(label=label, value=value, emoji=emoji)
            for value, label, emoji in FEATURES
            if value != "admin"
        ]
        super().__init__(placeholder="Jump to a system's panel...", options=options, row=0)

    async def callback(self, interaction: discord.Interaction) -> None:
        from views.main_menu import route_to_panel

        embed, view = await route_to_panel(self.values[0], interaction)
        if embed is None:
            return
        await interaction.response.edit_message(embed=embed, view=view)
        view.message = interaction.message
