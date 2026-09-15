import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.checks import require_admin
from utils.embeds import success_embed, error_embed
from views.verification_views import VerificationView


class Verification(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db

    @app_commands.command(name="verify-panel", description="Post the verification button in this channel")
    @require_admin()
    async def verify_panel(self, interaction: discord.Interaction):
        embed = success_embed("Verify Your Account", "Click the button below to complete verification and unlock the server.")
        await interaction.channel.send(embed=embed, view=VerificationView(self.db))
        await interaction.response.send_message("Verification panel posted.", ephemeral=True)

    @app_commands.command(name="verify-member", description="Manually verify a member")
    @app_commands.describe(member="The member to verify")
    @require_admin()
    async def verify_member(self, interaction: discord.Interaction, member: discord.Member):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        verified_role = interaction.guild.get_role(settings["verified_role_id"]) if settings["verified_role_id"] else None
        unverified_role = interaction.guild.get_role(settings["unverified_role_id"]) if settings["unverified_role_id"] else None
        if not verified_role:
            await interaction.response.send_message(
                embed=error_embed("Not configured", "Set the Verified role in `/onboarding-panel` first."), ephemeral=True
            )
            return
        await member.add_roles(verified_role, reason=f"Manually verified by {interaction.user}")
        if unverified_role and unverified_role in member.roles:
            await member.remove_roles(unverified_role, reason=f"Manually verified by {interaction.user}")
        await repo.set_verified(self.db, interaction.guild_id, member.id, True)
        await repo.log_verification(self.db, interaction.guild_id, member.id, method="manual_admin")
        await interaction.response.send_message(
            embed=success_embed("Member verified", f"{member.mention} has been verified."), ephemeral=True
        )

    @app_commands.command(name="unverify-member", description="Revoke a member's verification")
    @app_commands.describe(member="The member to unverify")
    @require_admin()
    async def unverify_member(self, interaction: discord.Interaction, member: discord.Member):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        verified_role = interaction.guild.get_role(settings["verified_role_id"]) if settings["verified_role_id"] else None
        unverified_role = interaction.guild.get_role(settings["unverified_role_id"]) if settings["unverified_role_id"] else None
        if verified_role and verified_role in member.roles:
            await member.remove_roles(verified_role, reason=f"Unverified by {interaction.user}")
        if unverified_role:
            await member.add_roles(unverified_role, reason=f"Unverified by {interaction.user}")
        await repo.set_verified(self.db, interaction.guild_id, member.id, False)
        await interaction.response.send_message(
            embed=success_embed("Member unverified", f"{member.mention} has been reverted to unverified."), ephemeral=True
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Verification(bot))
