"""Admin 'Giveaways' panel opened from /menu."""

from __future__ import annotations

import discord

from utils.embeds import base_embed
from views.common import PanelView


def build_giveaway_admin_panel(author_id: int):
    from views.main_menu import build_main_menu

    embed = base_embed(
        "🎉 Giveaway Management",
        "Use `/giveaway start`, `/giveaway end`, `/giveaway reroll`, `/giveaway cancel`, "
        "or `/giveaway list` to manage giveaways in this server.",
    )
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_nav_row(show_back=True)
    return embed, view
