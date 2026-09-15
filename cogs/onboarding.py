import logging

import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.checks import require_admin
from utils.embeds import success_embed, error_embed
from views.onboarding_admin_view import OnboardingAdminView, status_embed

logger = logging.getLogger("cogs.onboarding")


class Onboarding(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db

    # ─────────────────────────── member lifecycle ───────────────────────────

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        settings = await repo.get_guild_settings(self.db, member.guild.id)
        await repo.ensure_member(self.db, member.guild.id, member.id)
        if not settings["onboarding_enabled"] or not settings["unverified_role_id"]:
            return
        role = member.guild.get_role(settings["unverified_role_id"])
        if role:
            try:
                await member.add_roles(role, reason="New member — pending voice onboarding verification")
            except discord.Forbidden:
                logger.warning(f"Missing permission to add Unverified role in guild {member.guild.id}")

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        if member.bot:
            return
        settings = await repo.get_guild_settings(self.db, member.guild.id)
        vc_id = settings["onboarding_vc_id"]
        if not vc_id or not settings["onboarding_enabled"]:
            return

        joined_target = after.channel and after.channel.id == vc_id and (before.channel is None or before.channel.id != vc_id)
        left_target = before.channel and before.channel.id == vc_id and (after.channel is None or after.channel.id != vc_id)

        if joined_target:
            await self.bot.onboarding_manager.handle_member_joined_vc(member, after.channel)
        elif left_target:
            await self.bot.onboarding_manager.handle_member_left_vc(member, before.channel)

    # ─────────────────────────── admin commands ───────────────────────────

    @app_commands.command(name="onboarding-panel", description="Open the Voice Onboarding control panel")
    @require_admin()
    async def onboarding_panel(self, interaction: discord.Interaction):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await interaction.response.send_message(
            embed=status_embed(settings, interaction.guild),
            view=OnboardingAdminView(self.db),
            ephemeral=True,
        )

    @app_commands.command(name="onboarding-lockdown", description="Auto-configure channel visibility for the Unverified role")
    @require_admin()
    async def onboarding_lockdown(self, interaction: discord.Interaction):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        unverified_role = interaction.guild.get_role(settings["unverified_role_id"]) if settings["unverified_role_id"] else None
        if not unverified_role:
            await interaction.response.send_message(
                embed=error_embed("Not configured", "Set the Unverified role in `/onboarding-panel` first."),
                ephemeral=True,
            )
            return

        await interaction.response.defer(ephemeral=True, thinking=True)
        allowed_ids = {settings["onboarding_vc_id"], settings["verification_channel_id"]}
        updated = 0
        for channel in interaction.guild.channels:
            try:
                if channel.id in allowed_ids:
                    await channel.set_permissions(unverified_role, view_channel=True, connect=True,
                                                   reason="Onboarding lockdown: allow onboarding areas")
                else:
                    await channel.set_permissions(unverified_role, view_channel=False,
                                                   reason="Onboarding lockdown: hide normal channels")
                updated += 1
            except discord.Forbidden:
                continue
        await interaction.followup.send(
            embed=success_embed("Lockdown applied", f"Updated permission overwrites on {updated} channels."),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Onboarding(bot))
