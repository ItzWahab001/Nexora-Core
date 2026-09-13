"""Goodbye messages: posted when a member leaves, with {placeholder} support."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.checks import is_admin
from utils.embeds import base_embed, success_embed


def _render(template: str, member: discord.Member) -> str:
    return (
        template.replace("{user}", str(member))
        .replace("{username}", member.name)
        .replace("{server}", member.guild.name)
        .replace("{member_count}", str(member.guild.member_count))
    )


class Goodbye(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    goodbye_group = app_commands.Group(name="goodbye", description="Configure goodbye messages")

    @goodbye_group.command(name="setup", description="Enable goodbye messages in a channel")
    @is_admin()
    async def setup_cmd(self, interaction: discord.Interaction, channel: discord.TextChannel, message: str | None = None) -> None:
        fields = {"channel_id": channel.id, "enabled": 1}
        if message:
            fields["message"] = message
        await self.bot.db.upsert_goodbye_settings(interaction.guild_id, **fields)
        await interaction.response.send_message(embed=success_embed("Goodbye Messages Enabled", channel.mention), ephemeral=True)

    @goodbye_group.command(name="disable", description="Disable goodbye messages")
    @is_admin()
    async def disable(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_goodbye_settings(interaction.guild_id, enabled=0)
        await interaction.response.send_message(embed=success_embed("Goodbye Messages Disabled"), ephemeral=True)

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member) -> None:
        settings = await self.bot.db.get_goodbye_settings(member.guild.id)
        if settings and settings["enabled"] and settings["channel_id"]:
            channel = member.guild.get_channel(settings["channel_id"])
            if channel:
                embed = base_embed("🚪 Goodbye", _render(settings["message"], member))
                embed.set_thumbnail(url=member.display_avatar.url)
                await channel.send(embed=embed)

        logging_cog = self.bot.get_cog("LoggingCog")
        if logging_cog:
            await logging_cog.log_event(member.guild, "member_leave", f"🚪 {member} left ({member.guild.member_count} members)")


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Goodbye(bot))
