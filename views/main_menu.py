"""
The /menu control center: a Select menu that routes to each feature's own
dedicated panel. Panel-builder imports are done lazily inside the select
callback to avoid circular imports (each panel's Back/Home buttons import
`build_main_menu` from this module).
"""

from __future__ import annotations

import discord

from utils.embeds import base_embed
from views.common import CloseButton

FEATURES: list[tuple[str, str, str]] = [
    # (select value, label, emoji)
    ("tickets", "Tickets", "🎫"),
    ("music", "Music", "🎵"),
    ("giveaways", "Giveaways", "🎉"),
    ("ai", "AI Chat", "🤖"),
    ("moderation", "Moderation", "🛡️"),
    ("verification", "Verification", "✅"),
    ("welcome", "Welcome & Goodbye", "👋"),
    ("autorole", "Auto Role", "🎭"),
    ("custom", "Custom Commands", "⚙️"),
    ("automod", "AutoMod", "🚨"),
    ("logging", "Logging", "📋"),
    ("utility", "Utilities", "🔧"),
    ("server", "Server Info", "📊"),
    ("admin", "Admin Panel", "🔐"),
]


def build_main_menu(author_id: int) -> tuple[discord.Embed, discord.ui.View]:
    embed = base_embed(
        "🤖 Bot Control Center",
        "Welcome to the all-in-one control center.\nSelect a system below to open its panel.",
    )
    embed.add_field(
        name="Available Systems",
        value="\n".join(f"{emoji} {label}" for _, label, emoji in FEATURES),
        inline=False,
    )
    view = MainMenuView(author_id=author_id)
    return embed, view


class MainMenuView(discord.ui.View):
    def __init__(self, *, author_id: int) -> None:
        super().__init__(timeout=180)
        self.author_id = author_id
        self.message: discord.Message | None = None
        self.add_item(MainMenuSelect())
        self.add_item(CloseButton())

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                "Only the person who opened this menu can use it.", ephemeral=True
            )
            return False
        return True

    async def on_timeout(self) -> None:
        for item in self.children:
            item.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except discord.HTTPException:
                pass


class MainMenuSelect(discord.ui.Select):
    def __init__(self) -> None:
        options = [
            discord.SelectOption(label=label, value=value, emoji=emoji)
            for value, label, emoji in FEATURES
        ]
        super().__init__(
            placeholder="Select a system...",
            options=options,
            min_values=1,
            max_values=1,
            row=0,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        choice = self.values[0]
        embed, view = await route_to_panel(choice, interaction)
        if embed is None:
            return  # panel builder already responded (e.g. permission error)
        await interaction.response.edit_message(embed=embed, view=view)
        view.message = interaction.message


async def route_to_panel(choice: str, interaction: discord.Interaction):
    """Lazily imports and builds the panel for the chosen feature."""
    author_id = interaction.user.id
    bot = interaction.client

    if choice == "tickets":
        from views.ticket_panel import build_ticket_admin_panel

        return await build_ticket_admin_panel(bot, interaction.guild, author_id)
    if choice == "music":
        from views.music_panel import build_music_panel

        return build_music_panel(bot, interaction.guild_id, author_id)
    if choice == "giveaways":
        from views.giveaway_panel import build_giveaway_admin_panel

        return build_giveaway_admin_panel(author_id)
    if choice == "ai":
        from views.ai_panel import build_ai_panel

        return await build_ai_panel(bot, interaction.guild_id, author_id)
    if choice == "moderation":
        from views.moderation_panel import build_moderation_panel

        return build_moderation_panel(author_id)
    if choice == "verification":
        from cogs.verification import build_verification_admin_panel

        return await build_verification_admin_panel(bot, interaction.guild_id, author_id)
    if choice == "welcome":
        from cogs.welcome import build_welcome_admin_panel

        return await build_welcome_admin_panel(bot, interaction.guild_id, author_id)
    if choice == "autorole":
        from cogs.autorole import build_autorole_admin_panel

        return await build_autorole_admin_panel(bot, interaction.guild, author_id)
    if choice == "custom":
        from cogs.custom_commands import build_custom_commands_panel

        return await build_custom_commands_panel(bot, interaction.guild_id, author_id)
    if choice == "automod":
        from cogs.automod import build_automod_panel

        return await build_automod_panel(bot, interaction.guild_id, author_id)
    if choice == "logging":
        from cogs.logging_cog import build_logging_panel

        return await build_logging_panel(bot, interaction.guild_id, author_id)
    if choice == "utility":
        from views.common import PanelView
        from utils.embeds import info_embed

        embed = info_embed(
            "🔧 Utilities",
            "Use `/ping`, `/avatar`, `/userinfo`, `/serverinfo`, `/roleinfo`, "
            "`/channelinfo`, `/botinfo`, `/uptime`, or `/invite`.",
        )
        view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
        view.add_nav_row(show_back=False)
        return embed, view
    if choice == "server":
        from cogs.server import build_server_info_embed
        from views.common import PanelView

        embed = build_server_info_embed(interaction.guild)
        view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
        view.add_nav_row(show_back=False)
        return embed, view
    if choice == "admin":
        from views.admin_panel import build_admin_panel

        return build_admin_panel(author_id)

    from utils.embeds import error_embed

    return error_embed("Unknown Panel", "That panel isn't available."), None
