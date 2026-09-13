"""
Central event logger. Other cogs call `bot.get_cog("LoggingCog").log_event(...)`
for actions they already know about (bans, tickets, giveaways, etc); this
cog additionally listens directly for message delete/edit and role/channel
changes, which nothing else naturally observes.

Named `logging_cog.py` (not `logging.py`) to avoid any ambiguity with
Python's standard library `logging` module when imported as a submodule.
"""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.checks import is_admin
from utils.embeds import base_embed, success_embed
from utils.helpers import truncate
from views.common import PanelView

ALL_EVENTS = [
    "member_join", "member_leave", "message_delete", "message_edit", "ban", "kick",
    "timeout", "warning", "warn", "role_update", "channel_update", "ticket",
    "giveaway", "verification", "config", "automod",
]


class LoggingCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    logs_group = app_commands.Group(name="logs", description="Configure event logging")

    @logs_group.command(name="setup", description="Set the logging channel")
    @is_admin()
    async def setup_cmd(self, interaction: discord.Interaction, channel: discord.TextChannel) -> None:
        await self.bot.db.upsert_logging_settings(interaction.guild_id, log_channel_id=channel.id, enabled=1)
        await interaction.response.send_message(embed=success_embed("Logging Enabled", channel.mention), ephemeral=True)

    @logs_group.command(name="disable", description="Disable event logging")
    @is_admin()
    async def disable(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_logging_settings(interaction.guild_id, enabled=0)
        await interaction.response.send_message(embed=success_embed("Logging Disabled"), ephemeral=True)

    @logs_group.command(name="events", description="Show which events are logged")
    async def events(self, interaction: discord.Interaction) -> None:
        settings = await self.bot.db.get_logging_settings(interaction.guild_id)
        events = settings["events"] if settings else ",".join(ALL_EVENTS)
        await interaction.response.send_message(embed=base_embed("📋 Logged Events", events.replace(",", ", ")), ephemeral=True)

    async def log_event(self, guild: discord.Guild, event: str, text: str) -> None:
        settings = await self.bot.db.get_logging_settings(guild.id)
        if not settings or not settings["enabled"] or not settings["log_channel_id"]:
            return
        enabled_events = settings["events"].split(",")
        if event not in enabled_events:
            return
        channel = guild.get_channel(settings["log_channel_id"])
        if channel is None:
            return
        embed = base_embed("📋 Server Log", truncate(text, 2000))
        try:
            await channel.send(embed=embed)
        except discord.HTTPException:
            pass

    @commands.Cog.listener()
    async def on_message_delete(self, message: discord.Message) -> None:
        if message.author.bot or message.guild is None:
            return
        await self.log_event(
            message.guild, "message_delete",
            f"🗑️ Message by {message.author.mention} deleted in {message.channel.mention}:\n{truncate(message.content or '[no text content]', 500)}",
        )

    @commands.Cog.listener()
    async def on_message_edit(self, before: discord.Message, after: discord.Message) -> None:
        if before.author.bot or before.guild is None or before.content == after.content:
            return
        await self.log_event(
            before.guild, "message_edit",
            f"✏️ Message by {before.author.mention} edited in {before.channel.mention}\n"
            f"Before: {truncate(before.content, 300)}\nAfter: {truncate(after.content, 300)}",
        )

    @commands.Cog.listener()
    async def on_guild_role_update(self, before: discord.Role, after: discord.Role) -> None:
        if before.name != after.name or before.permissions != after.permissions:
            await self.log_event(before.guild, "role_update", f"🎭 Role **{before.name}** updated.")

    @commands.Cog.listener()
    async def on_guild_channel_create(self, channel: discord.abc.GuildChannel) -> None:
        await self.log_event(channel.guild, "channel_update", f"📁 Channel created: {channel.mention}")

    @commands.Cog.listener()
    async def on_guild_channel_delete(self, channel: discord.abc.GuildChannel) -> None:
        await self.log_event(channel.guild, "channel_update", f"📁 Channel deleted: #{channel.name}")


async def build_logging_panel(bot, guild_id: int, author_id: int):
    from views.main_menu import build_main_menu

    settings = await bot.db.get_logging_settings(guild_id)
    status = f"Enabled ✅ in <#{settings['log_channel_id']}>" if settings and settings["enabled"] else "Disabled ❌"

    embed = base_embed("📋 Logging Center", "Configure which server events get logged.")
    embed.add_field(name="Status", value=status, inline=False)
    embed.add_field(name="Commands", value="`/logs setup` `/logs disable` `/logs events`", inline=False)
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_nav_row(show_back=False)
    return embed, view


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(LoggingCog(bot))
