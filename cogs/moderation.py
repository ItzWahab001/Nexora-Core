import datetime

import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.checks import require_moderator, require_admin
from utils.embeds import success_embed, error_embed, panel_embed


class Moderation(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db

    async def _log(self, guild: discord.Guild, embed: discord.Embed):
        settings = await repo.get_guild_settings(self.db, guild.id)
        ch = guild.get_channel(settings["mod_log_channel_id"]) if settings["mod_log_channel_id"] else None
        if isinstance(ch, discord.TextChannel):
            await ch.send(embed=embed)

    @app_commands.command(name="mod-log-channel", description="Set the moderation log channel")
    @require_admin()
    async def set_log_channel(self, interaction: discord.Interaction, channel: discord.TextChannel):
        await repo.update_guild_settings(self.db, interaction.guild_id, mod_log_channel_id=channel.id)
        await interaction.response.send_message(embed=success_embed("Saved", f"Mod logs will go to {channel.mention}"), ephemeral=True)

    @app_commands.command(name="ban", description="Ban a member")
    @require_moderator()
    async def ban(self, interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided"):
        case_id = await repo.add_case(self.db, interaction.guild_id, member.id, interaction.user.id, "ban", reason)
        await member.ban(reason=f"[Case #{case_id}] {reason}")
        embed = panel_embed(f"🔨 Ban — Case #{case_id}", "", [("User", str(member), True), ("Moderator", str(interaction.user), True), ("Reason", reason, False)])
        await interaction.response.send_message(embed=embed)
        await self._log(interaction.guild, embed)

    @app_commands.command(name="unban", description="Unban a user by ID")
    @require_moderator()
    async def unban(self, interaction: discord.Interaction, user_id: str, reason: str = "No reason provided"):
        user = discord.Object(id=int(user_id))
        case_id = await repo.add_case(self.db, interaction.guild_id, int(user_id), interaction.user.id, "unban", reason)
        await interaction.guild.unban(user, reason=f"[Case #{case_id}] {reason}")
        await interaction.response.send_message(embed=success_embed(f"Unbanned — Case #{case_id}", f"User ID `{user_id}`"))

    @app_commands.command(name="kick", description="Kick a member")
    @require_moderator()
    async def kick(self, interaction: discord.Interaction, member: discord.Member, reason: str = "No reason provided"):
        case_id = await repo.add_case(self.db, interaction.guild_id, member.id, interaction.user.id, "kick", reason)
        await member.kick(reason=f"[Case #{case_id}] {reason}")
        embed = panel_embed(f"👢 Kick — Case #{case_id}", "", [("User", str(member), True), ("Moderator", str(interaction.user), True), ("Reason", reason, False)])
        await interaction.response.send_message(embed=embed)
        await self._log(interaction.guild, embed)

    @app_commands.command(name="timeout", description="Timeout a member")
    @app_commands.describe(minutes="Duration in minutes")
    @require_moderator()
    async def timeout(self, interaction: discord.Interaction, member: discord.Member,
                       minutes: app_commands.Range[int, 1, 40320], reason: str = "No reason provided"):
        case_id = await repo.add_case(self.db, interaction.guild_id, member.id, interaction.user.id, "timeout", reason, minutes * 60)
        until = discord.utils.utcnow() + datetime.timedelta(minutes=minutes)
        await member.timeout(until, reason=f"[Case #{case_id}] {reason}")
        embed = panel_embed(f"🔇 Timeout — Case #{case_id}", "",
                             [("User", str(member), True), ("Duration", f"{minutes}m", True), ("Reason", reason, False)])
        await interaction.response.send_message(embed=embed)
        await self._log(interaction.guild, embed)

    @app_commands.command(name="warn", description="Warn a member")
    @require_moderator()
    async def warn(self, interaction: discord.Interaction, member: discord.Member, reason: str):
        warning_id = await repo.add_warning(self.db, interaction.guild_id, member.id, interaction.user.id, reason)
        case_id = await repo.add_case(self.db, interaction.guild_id, member.id, interaction.user.id, "warn", reason)
        embed = panel_embed(f"⚠️ Warning #{warning_id} — Case #{case_id}", "",
                             [("User", str(member), True), ("Moderator", str(interaction.user), True), ("Reason", reason, False)])
        await interaction.response.send_message(embed=embed)
        await self._log(interaction.guild, embed)
        try:
            await member.send(f"You were warned in **{interaction.guild.name}**: {reason}")
        except discord.Forbidden:
            pass

    @app_commands.command(name="warnings", description="View a member's warning history")
    @require_moderator()
    async def warnings(self, interaction: discord.Interaction, member: discord.Member):
        rows = await repo.get_warnings(self.db, interaction.guild_id, member.id)
        if not rows:
            await interaction.response.send_message(embed=success_embed("No warnings", f"{member.mention} has a clean record."), ephemeral=True)
            return
        desc = "\n".join(f"**#{r['warning_id']}** — {r['reason']} (by <@{r['moderator_id']}>)" for r in rows)
        await interaction.response.send_message(embed=panel_embed(f"Warnings for {member}", desc), ephemeral=True)

    @app_commands.command(name="clear", description="Bulk delete messages")
    @require_moderator()
    async def clear(self, interaction: discord.Interaction, amount: app_commands.Range[int, 1, 500]):
        await interaction.response.defer(ephemeral=True)
        deleted = await interaction.channel.purge(limit=amount)
        await interaction.followup.send(embed=success_embed("Cleared", f"Deleted {len(deleted)} messages."), ephemeral=True)

    @app_commands.command(name="slowmode", description="Set channel slowmode (seconds, 0 to disable)")
    @require_moderator()
    async def slowmode(self, interaction: discord.Interaction, seconds: app_commands.Range[int, 0, 21600]):
        await interaction.channel.edit(slowmode_delay=seconds)
        await interaction.response.send_message(embed=success_embed("Slowmode updated", f"Set to {seconds}s."), ephemeral=True)

    @app_commands.command(name="lock", description="Lock the current channel")
    @require_moderator()
    async def lock(self, interaction: discord.Interaction):
        overwrite = interaction.channel.overwrites_for(interaction.guild.default_role)
        overwrite.send_messages = False
        await interaction.channel.set_permissions(interaction.guild.default_role, overwrite=overwrite)
        await interaction.response.send_message(embed=success_embed("Channel locked"))

    @app_commands.command(name="unlock", description="Unlock the current channel")
    @require_moderator()
    async def unlock(self, interaction: discord.Interaction):
        overwrite = interaction.channel.overwrites_for(interaction.guild.default_role)
        overwrite.send_messages = None
        await interaction.channel.set_permissions(interaction.guild.default_role, overwrite=overwrite)
        await interaction.response.send_message(embed=success_embed("Channel unlocked"))


async def setup(bot: commands.Bot):
    await bot.add_cog(Moderation(bot))
