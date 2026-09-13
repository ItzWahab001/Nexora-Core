"""Auto Role: automatically assigns configured roles to new members."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.checks import is_admin
from utils.embeds import base_embed, error_embed, success_embed
from views.common import PanelView


class AutoRole(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    autorole_group = app_commands.Group(name="autorole", description="Configure automatic role assignment")

    @autorole_group.command(name="add", description="Add a role to auto-assign to new members")
    @is_admin()
    async def add(self, interaction: discord.Interaction, role: discord.Role) -> None:
        if role.managed or role.is_default():
            await interaction.response.send_message(embed=error_embed("Invalid Role", "Can't use managed or @everyone roles."), ephemeral=True)
            return
        if role.position >= interaction.guild.me.top_role.position:
            await interaction.response.send_message(embed=error_embed("Role Too High", "My highest role must be above this role."), ephemeral=True)
            return
        await self.bot.db.add_autorole(interaction.guild_id, role.id)
        await interaction.response.send_message(embed=success_embed("Auto Role Added", role.mention), ephemeral=True)

    @autorole_group.command(name="remove", description="Remove an auto-role")
    @is_admin()
    async def remove(self, interaction: discord.Interaction, role: discord.Role) -> None:
        await self.bot.db.remove_autorole(interaction.guild_id, role.id)
        await interaction.response.send_message(embed=success_embed("Auto Role Removed", role.mention), ephemeral=True)

    @autorole_group.command(name="setup", description="List currently configured auto-roles")
    @is_admin()
    async def setup_cmd(self, interaction: discord.Interaction) -> None:
        role_ids = await self.bot.db.get_autoroles(interaction.guild_id)
        if not role_ids:
            await interaction.response.send_message(embed=error_embed("No Auto Roles Configured"), ephemeral=True)
            return
        await interaction.response.send_message("Auto roles: " + ", ".join(f"<@&{r}>" for r in role_ids), ephemeral=True)

    @autorole_group.command(name="disable", description="Remove all auto-roles")
    @is_admin()
    async def disable(self, interaction: discord.Interaction) -> None:
        role_ids = await self.bot.db.get_autoroles(interaction.guild_id)
        for role_id in role_ids:
            await self.bot.db.remove_autorole(interaction.guild_id, role_id)
        await interaction.response.send_message(embed=success_embed("Auto Roles Cleared"), ephemeral=True)

    async def apply_autoroles(self, member: discord.Member) -> None:
        role_ids = await self.bot.db.get_autoroles(member.guild.id)
        roles_to_add = []
        for role_id in role_ids:
            role = member.guild.get_role(role_id)
            if role and role.position < member.guild.me.top_role.position:
                roles_to_add.append(role)
        if roles_to_add:
            try:
                await member.add_roles(*roles_to_add, reason="Auto role")
            except discord.Forbidden:
                pass


async def build_autorole_admin_panel(bot, guild: discord.Guild, author_id: int):
    from views.main_menu import build_main_menu

    role_ids = await bot.db.get_autoroles(guild.id)
    roles_text = ", ".join(f"<@&{r}>" for r in role_ids) if role_ids else "None configured"

    embed = base_embed("🎭 Auto Role", "Automatically assign roles to new members.")
    embed.add_field(name="Current Auto Roles", value=roles_text, inline=False)
    embed.add_field(name="Commands", value="`/autorole add` `/autorole remove` `/autorole setup` `/autorole disable`", inline=False)
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_nav_row(show_back=False)
    return embed, view


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AutoRole(bot))
