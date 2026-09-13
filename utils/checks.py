"""
app_commands checks used as decorators on slash commands, and small guard
functions used inside interaction callbacks (e.g. from Views, where
app_commands.check decorators cannot be applied directly).
"""

from __future__ import annotations

import discord
from discord import app_commands

from config import config
from utils.embeds import error_embed


class NotConfigured(app_commands.AppCommandError):
    """Raised when a feature is used before an admin has configured it."""


def is_admin():
    async def predicate(interaction: discord.Interaction) -> bool:
        if interaction.user.id in config.owner_ids:
            return True
        if isinstance(interaction.user, discord.Member) and (
            interaction.user.guild_permissions.administrator
            or interaction.user.guild_permissions.manage_guild
        ):
            return True
        raise app_commands.MissingPermissions(["manage_guild"])

    return app_commands.check(predicate)


def is_mod():
    async def predicate(interaction: discord.Interaction) -> bool:
        if interaction.user.id in config.owner_ids:
            return True
        member = interaction.user
        if isinstance(member, discord.Member) and (
            member.guild_permissions.moderate_members
            or member.guild_permissions.kick_members
            or member.guild_permissions.ban_members
            or member.guild_permissions.manage_guild
        ):
            return True
        raise app_commands.MissingPermissions(["moderate_members"])

    return app_commands.check(predicate)


async def guild_only_guard(interaction: discord.Interaction) -> bool:
    if interaction.guild is None:
        await interaction.response.send_message(
            embed=error_embed("Server Only", "This can only be used inside a server."),
            ephemeral=True,
        )
        return False
    return True


async def member_is_staff(interaction: discord.Interaction) -> bool:
    """Lightweight check usable inside a View button callback (no decorator context)."""
    member = interaction.user
    if member.id in config.owner_ids:
        return True
    if isinstance(member, discord.Member) and (
        member.guild_permissions.manage_guild or member.guild_permissions.administrator
    ):
        return True
    return False
