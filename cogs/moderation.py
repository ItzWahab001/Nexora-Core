"""
Moderation commands: ban, unban, kick, timeout, untimeout, warn, warnings,
clear, slowmode, lock, unlock, announce. Every action that targets a member
goes through utils.permissions role-hierarchy checks before touching
discord's API, and is mirrored to the log channel via LoggingCog if set up.
"""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from services.moderation_service import moderation_service
from utils.checks import is_mod
from utils.embeds import base_embed, error_embed, success_embed
from utils.helpers import parse_duration
from utils.permissions import bot_can_moderate, can_moderate


async def _log(bot, guild: discord.Guild, event: str, text: str) -> None:
    logging_cog = bot.get_cog("LoggingCog")
    if logging_cog:
        await logging_cog.log_event(guild, event, text)


class Moderation(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="ban", description="Ban a member from the server")
    @is_mod()
    @app_commands.describe(member="Member to ban", reason="Reason for the ban", delete_days="Days of messages to delete (0-7)")
    async def ban(self, interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided", delete_days: app_commands.Range[int, 0, 7] = 0) -> None:
        allowed, why = can_moderate(interaction.user, member)
        if not allowed:
            await interaction.response.send_message(embed=error_embed("Permission Denied", why), ephemeral=True)
            return
        allowed, why = bot_can_moderate(interaction.guild, member)
        if not allowed:
            await interaction.response.send_message(embed=error_embed("I Can't Do That", why), ephemeral=True)
            return
        await moderation_service.ban(interaction.guild, member, reason, delete_days)
        await interaction.response.send_message(embed=success_embed("Member Banned", f"{member.mention} — {reason}"))
        await _log(self.bot, interaction.guild, "ban", f"🔨 {member} banned by {interaction.user} — {reason}")

    @app_commands.command(name="unban", description="Unban a user by ID")
    @is_mod()
    async def unban(self, interaction: discord.Interaction, user_id: str, reason: str = "No reason provided") -> None:
        if not user_id.isdigit():
            await interaction.response.send_message(embed=error_embed("Invalid User ID"), ephemeral=True)
            return
        await moderation_service.unban(interaction.guild, int(user_id), reason)
        await interaction.response.send_message(embed=success_embed("Member Unbanned", f"<@{user_id}>"))
        await _log(self.bot, interaction.guild, "ban", f"🔓 {user_id} unbanned by {interaction.user}")

    @app_commands.command(name="kick", description="Kick a member from the server")
    @is_mod()
    async def kick(self, interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided") -> None:
        allowed, why = can_moderate(interaction.user, member)
        if not allowed:
            await interaction.response.send_message(embed=error_embed("Permission Denied", why), ephemeral=True)
            return
        allowed, why = bot_can_moderate(interaction.guild, member)
        if not allowed:
            await interaction.response.send_message(embed=error_embed("I Can't Do That", why), ephemeral=True)
            return
        await moderation_service.kick(interaction.guild, member, reason)
        await interaction.response.send_message(embed=success_embed("Member Kicked", f"{member.mention} — {reason}"))
        await _log(self.bot, interaction.guild, "kick", f"👢 {member} kicked by {interaction.user} — {reason}")

    @app_commands.command(name="timeout", description="Timeout a member")
    @is_mod()
    @app_commands.describe(duration="e.g. 10m, 1h, 1d")
    async def timeout(self, interaction: discord.Interaction, member: discord.Member, duration: str, reason: str = "No reason provided") -> None:
        allowed, why = can_moderate(interaction.user, member)
        if not allowed:
            await interaction.response.send_message(embed=error_embed("Permission Denied", why), ephemeral=True)
            return
        seconds = parse_duration(duration)
        if not seconds or seconds > 28 * 86400:
            await interaction.response.send_message(embed=error_embed("Invalid Duration", "Max timeout is 28 days."), ephemeral=True)
            return
        await moderation_service.timeout(member, seconds, reason)
        await interaction.response.send_message(embed=success_embed("Member Timed Out", f"{member.mention} for {duration} — {reason}"))
        await _log(self.bot, interaction.guild, "timeout", f"⏱️ {member} timed out by {interaction.user} for {duration} — {reason}")

    @app_commands.command(name="untimeout", description="Remove a member's timeout")
    @is_mod()
    async def untimeout(self, interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided") -> None:
        await moderation_service.remove_timeout(member, reason)
        await interaction.response.send_message(embed=success_embed("Timeout Removed", member.mention))

    @app_commands.command(name="warn", description="Warn a member")
    @is_mod()
    async def warn(self, interaction: discord.Interaction, member: discord.Member, reason: str) -> None:
        allowed, why = can_moderate(interaction.user, member)
        if not allowed:
            await interaction.response.send_message(embed=error_embed("Permission Denied", why), ephemeral=True)
            return
        warning_id = await self.bot.db.add_warning(interaction.guild_id, member.id, interaction.user.id, reason)
        await interaction.response.send_message(embed=success_embed("Member Warned", f"{member.mention} — {reason} (#{warning_id})"))
        await _log(self.bot, interaction.guild, "warning", f"⚠️ {member} warned by {interaction.user} — {reason}")
        try:
            await member.send(embed=error_embed(f"Warning from {interaction.guild.name}", reason))
        except discord.Forbidden:
            pass

    @app_commands.command(name="warnings", description="View a member's warnings")
    async def warnings(self, interaction: discord.Interaction, member: discord.Member) -> None:
        rows = await self.bot.db.get_warnings(interaction.guild_id, member.id)
        if not rows:
            await interaction.response.send_message(embed=success_embed("No Warnings", f"{member.mention} has a clean record."), ephemeral=True)
            return
        embed = base_embed(f"⚠️ Warnings for {member}")
        for r in rows[:15]:
            embed.add_field(name=f"#{r['warning_id']} — {r['created_at'][:10]}", value=f"{r['reason']} (by <@{r['moderator_id']}>)", inline=False)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="clear", description="Bulk delete messages")
    @is_mod()
    async def clear(self, interaction: discord.Interaction, amount: app_commands.Range[int, 1, 100]) -> None:
        await interaction.response.defer(ephemeral=True)
        deleted = await interaction.channel.purge(limit=amount)
        await interaction.followup.send(embed=success_embed("Messages Cleared", f"Deleted {len(deleted)} messages."), ephemeral=True)

    @app_commands.command(name="slowmode", description="Set channel slowmode")
    @is_mod()
    async def slowmode(self, interaction: discord.Interaction, seconds: app_commands.Range[int, 0, 21600]) -> None:
        await interaction.channel.edit(slowmode_delay=seconds)
        await interaction.response.send_message(embed=success_embed("Slowmode Set", f"{seconds}s"))

    @app_commands.command(name="lock", description="Lock the current channel")
    @is_mod()
    async def lock(self, interaction: discord.Interaction) -> None:
        overwrite = interaction.channel.overwrites_for(interaction.guild.default_role)
        overwrite.send_messages = False
        await interaction.channel.set_permissions(interaction.guild.default_role, overwrite=overwrite)
        await interaction.response.send_message(embed=success_embed("Channel Locked", "🔒"))

    @app_commands.command(name="unlock", description="Unlock the current channel")
    @is_mod()
    async def unlock(self, interaction: discord.Interaction) -> None:
        overwrite = interaction.channel.overwrites_for(interaction.guild.default_role)
        overwrite.send_messages = None
        await interaction.channel.set_permissions(interaction.guild.default_role, overwrite=overwrite)
        await interaction.response.send_message(embed=success_embed("Channel Unlocked", "🔓"))

    @app_commands.command(name="announce", description="Send an announcement embed")
    @is_mod()
    async def announce(self, interaction: discord.Interaction, channel: discord.TextChannel, title: str, message: str) -> None:
        embed = base_embed(f"📢 {title}", message)
        await channel.send(embed=embed)
        await interaction.response.send_message(embed=success_embed("Announcement Sent", channel.mention), ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Moderation(bot))
