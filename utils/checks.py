"""
Server-side permission checks. Never rely on hiding a button/menu as
security — every privileged interaction re-validates here.
"""
import discord
from discord import app_commands


def is_staff(member: discord.Member) -> bool:
    return member.guild_permissions.manage_guild or member.guild_permissions.administrator


def is_moderator(member: discord.Member) -> bool:
    perms = member.guild_permissions
    return perms.administrator or perms.kick_members or perms.ban_members or perms.moderate_members


def require_admin():
    async def predicate(interaction: discord.Interaction) -> bool:
        if not isinstance(interaction.user, discord.Member):
            return False
        if is_staff(interaction.user):
            return True
        await interaction.response.send_message(
            "You need **Manage Server** permission to use this.", ephemeral=True
        )
        return False
    return app_commands.check(predicate)


def require_moderator():
    async def predicate(interaction: discord.Interaction) -> bool:
        if not isinstance(interaction.user, discord.Member):
            return False
        if is_moderator(interaction.user):
            return True
        await interaction.response.send_message(
            "You don't have moderation permissions to use this.", ephemeral=True
        )
        return False
    return app_commands.check(predicate)


async def verify_interaction_permission(interaction: discord.Interaction, check_fn) -> bool:
    """Re-validate a button/select interaction server-side before acting on it."""
    if not isinstance(interaction.user, discord.Member):
        await interaction.response.send_message("This can only be used in a server.", ephemeral=True)
        return False
    if not check_fn(interaction.user):
        await interaction.response.send_message("You don't have permission to do that.", ephemeral=True)
        return False
    return True
