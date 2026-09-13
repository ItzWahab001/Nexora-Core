"""Welcome messages: posted when a member joins, with {placeholder} support."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.checks import is_admin
from utils.embeds import base_embed, success_embed
from views.common import PanelView

PLACEHOLDER_HELP = "Placeholders: `{user}` `{username}` `{server}` `{member_count}`"


def _render(template: str, member: discord.Member) -> str:
    return (
        template.replace("{user}", member.mention)
        .replace("{username}", member.name)
        .replace("{server}", member.guild.name)
        .replace("{member_count}", str(member.guild.member_count))
    )


class Welcome(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    welcome_group = app_commands.Group(name="welcome", description="Configure welcome messages")

    @welcome_group.command(name="setup", description="Enable welcome messages in a channel")
    @is_admin()
    async def setup_cmd(self, interaction: discord.Interaction, channel: discord.TextChannel, message: str | None = None) -> None:
        fields = {"channel_id": channel.id, "enabled": 1}
        if message:
            fields["message"] = message
        await self.bot.db.upsert_welcome_settings(interaction.guild_id, **fields)
        await interaction.response.send_message(embed=success_embed("Welcome Messages Enabled", f"{channel.mention}\n{PLACEHOLDER_HELP}"), ephemeral=True)

    @welcome_group.command(name="disable", description="Disable welcome messages")
    @is_admin()
    async def disable(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_welcome_settings(interaction.guild_id, enabled=0)
        await interaction.response.send_message(embed=success_embed("Welcome Messages Disabled"), ephemeral=True)

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member) -> None:
        settings = await self.bot.db.get_welcome_settings(member.guild.id)
        if settings and settings["enabled"] and settings["channel_id"]:
            channel = member.guild.get_channel(settings["channel_id"])
            if channel:
                embed = base_embed("👋 Welcome!", _render(settings["message"], member))
                embed.set_thumbnail(url=member.display_avatar.url)
                await channel.send(embed=embed)

        autorole_cog = self.bot.get_cog("AutoRole")
        if autorole_cog:
            await autorole_cog.apply_autoroles(member)

        logging_cog = self.bot.get_cog("LoggingCog")
        if logging_cog:
            await logging_cog.log_event(member.guild, "member_join", f"👤 {member} joined ({member.guild.member_count} members)")


async def build_welcome_admin_panel(bot, guild_id: int, author_id: int):
    from views.main_menu import build_main_menu

    welcome = await bot.db.get_welcome_settings(guild_id)
    goodbye = await bot.db.get_goodbye_settings(guild_id)

    embed = base_embed("👋 Welcome & Goodbye", "Configure join/leave messages for this server.")
    embed.add_field(
        name="Welcome",
        value=(f"Enabled ✅ in <#{welcome['channel_id']}>" if welcome and welcome["enabled"] else "Disabled ❌"),
        inline=False,
    )
    embed.add_field(
        name="Goodbye",
        value=(f"Enabled ✅ in <#{goodbye['channel_id']}>" if goodbye and goodbye["enabled"] else "Disabled ❌"),
        inline=False,
    )
    embed.add_field(
        name="Commands",
        value="`/welcome setup` / `/welcome disable`\n`/goodbye setup` / `/goodbye disable`\n" + PLACEHOLDER_HELP,
        inline=False,
    )
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_nav_row(show_back=True)
    return embed, view


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Welcome(bot))
