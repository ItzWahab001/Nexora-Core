"""
Verification system: a persistent 'Verify Me' button that grants a
configured verified role (and optionally removes an unverified role) the
first time a member clicks it. Also exposes the admin panel builder used by
/menu -> ✅ Verification.
"""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.checks import is_admin
from utils.embeds import base_embed, error_embed, success_embed
from views.common import PanelView


class VerifyButton(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Verify Me", emoji="🔐", style=discord.ButtonStyle.success, custom_id="verify_button")

    async def callback(self, interaction: discord.Interaction) -> None:
        bot = interaction.client
        settings = await bot.db.get_verification_settings(interaction.guild_id)
        if not settings or not settings["enabled"] or not settings["verified_role_id"]:
            await interaction.response.send_message(
                embed=error_embed(
                    "Verification Not Configured",
                    "An admin needs to run `/verify role` to set the role given on verification "
                    "before this button will work.",
                ),
                ephemeral=True,
            )
            return
        if await bot.db.is_verified(interaction.guild_id, interaction.user.id):
            await interaction.response.send_message(embed=error_embed("Already Verified"), ephemeral=True)
            return

        role = interaction.guild.get_role(settings["verified_role_id"])
        if role is None:
            await interaction.response.send_message(embed=error_embed("Verified Role Missing"), ephemeral=True)
            return

        await interaction.user.add_roles(role, reason="Verification")
        if settings["unverified_role_id"]:
            unverified = interaction.guild.get_role(settings["unverified_role_id"])
            if unverified and unverified in interaction.user.roles:
                await interaction.user.remove_roles(unverified, reason="Verification")

        await bot.db.mark_verified(interaction.guild_id, interaction.user.id)
        await interaction.response.send_message(embed=success_embed("Verified!", "Welcome to the server."), ephemeral=True)

        logging_cog = bot.get_cog("LoggingCog")
        if logging_cog:
            await logging_cog.log_event(interaction.guild, "verification", f"✅ {interaction.user} verified.")


class VerifyView(discord.ui.View):
    def __init__(self) -> None:
        super().__init__(timeout=None)
        self.add_item(VerifyButton())


class Verification(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    verify_group = app_commands.Group(name="verify", description="Configure the verification system")

    @verify_group.command(name="setup", description="Post the verification panel in a channel")
    @is_admin()
    async def setup_cmd(self, interaction: discord.Interaction, channel: discord.TextChannel | None = None) -> None:
        channel = channel or interaction.channel
        embed = base_embed("✅ Verification Center", "Click the button below to verify yourself and gain access to the server.")
        message = await channel.send(embed=embed, view=VerifyView())
        await self.bot.db.upsert_verification_settings(interaction.guild_id, channel_id=channel.id, message_id=message.id, enabled=1)
        await interaction.response.send_message(embed=success_embed("Verification Panel Posted", channel.mention), ephemeral=True)

    @verify_group.command(name="role", description="Set the role given upon verification")
    @is_admin()
    async def role(self, interaction: discord.Interaction, role: discord.Role) -> None:
        await self.bot.db.upsert_verification_settings(interaction.guild_id, verified_role_id=role.id)
        await interaction.response.send_message(embed=success_embed("Verified Role Set", role.mention), ephemeral=True)

    @verify_group.command(name="unverified_role", description="Set the role removed upon verification (optional)")
    @is_admin()
    async def unverified_role(self, interaction: discord.Interaction, role: discord.Role) -> None:
        await self.bot.db.upsert_verification_settings(interaction.guild_id, unverified_role_id=role.id)
        await interaction.response.send_message(embed=success_embed("Unverified Role Set", role.mention), ephemeral=True)

    @verify_group.command(name="channel", description="Set the verification channel")
    @is_admin()
    async def channel(self, interaction: discord.Interaction, channel: discord.TextChannel) -> None:
        await self.bot.db.upsert_verification_settings(interaction.guild_id, channel_id=channel.id)
        await interaction.response.send_message(embed=success_embed("Verification Channel Set", channel.mention), ephemeral=True)

    @verify_group.command(name="disable", description="Disable the verification system")
    @is_admin()
    async def disable(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_verification_settings(interaction.guild_id, enabled=0)
        await interaction.response.send_message(embed=success_embed("Verification Disabled"), ephemeral=True)


async def build_verification_admin_panel(bot, guild_id: int, author_id: int):
    from views.main_menu import build_main_menu

    settings = await bot.db.get_verification_settings(guild_id)
    status = "Enabled ✅" if settings and settings["enabled"] else "Disabled ❌"
    role = f"<@&{settings['verified_role_id']}>" if settings and settings["verified_role_id"] else "Not set"

    embed = base_embed("✅ Verification Center", "Manage member verification for this server.")
    embed.add_field(name="Status", value=status, inline=True)
    embed.add_field(name="Verified Role", value=role, inline=True)
    embed.add_field(
        name="Commands",
        value="`/verify setup` — post panel\n`/verify role` — set verified role\n"
        "`/verify unverified_role` — set role to strip\n`/verify channel` — set channel\n`/verify disable`",
        inline=False,
    )
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_nav_row(show_back=True)
    return embed, view


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Verification(bot))
