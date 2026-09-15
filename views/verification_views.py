"""
Verification button. This is a *persistent* view (timeout=None, static
custom_id) so it keeps working after a bot restart as long as
bot.add_view(VerificationView(db)) is called once in setup_hook.
"""
import logging

import discord

from database import repo
from database.db import Database
from utils.embeds import success_embed, error_embed

logger = logging.getLogger("views.verification")


class VerificationView(discord.ui.View):
    def __init__(self, db: Database):
        super().__init__(timeout=None)
        self.db = db

    @discord.ui.button(label="Verify", style=discord.ButtonStyle.success,
                        emoji="✅", custom_id="onboarding:verify_button")
    async def verify(self, interaction: discord.Interaction, button: discord.ui.Button):
        member = interaction.user
        guild = interaction.guild
        if not isinstance(member, discord.Member) or guild is None:
            await interaction.response.send_message("This only works inside a server.", ephemeral=True)
            return

        # Server-side re-validation — never trust that the button was only
        # shown to unverified members.
        if await repo.is_verified(self.db, guild.id, member.id):
            await interaction.response.send_message(
                embed=error_embed("Already verified", "You're already verified — enjoy the server!"),
                ephemeral=True,
            )
            return

        settings = await repo.get_guild_settings(self.db, guild.id)
        verified_role = guild.get_role(settings["verified_role_id"]) if settings["verified_role_id"] else None
        unverified_role = guild.get_role(settings["unverified_role_id"]) if settings["unverified_role_id"] else None

        if verified_role is None:
            await interaction.response.send_message(
                embed=error_embed("Setup incomplete", "No Verified role is configured. Ask an admin to run `/onboarding-panel`."),
                ephemeral=True,
            )
            return

        try:
            await member.add_roles(verified_role, reason="Completed voice onboarding verification")
            if unverified_role and unverified_role in member.roles:
                await member.remove_roles(unverified_role, reason="Completed voice onboarding verification")
        except discord.Forbidden:
            await interaction.response.send_message(
                embed=error_embed("Missing permissions", "I don't have permission to manage roles here. Ask an admin to check my role position/permissions."),
                ephemeral=True,
            )
            return

        await repo.set_verified(self.db, guild.id, member.id, True)
        await repo.log_verification(self.db, guild.id, member.id)

        active = await repo.get_active_session(self.db, guild.id, member.id)
        if active:
            await repo.complete_session(self.db, active["session_id"], status="completed")

        await interaction.response.send_message(
            embed=success_embed("Verified!", f"Welcome to **{guild.name}** — you now have full access."),
            ephemeral=True,
        )
        await self.db.log(guild.id, "verification", f"{member} ({member.id}) verified via button")
