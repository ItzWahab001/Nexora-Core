"""Permission and role-hierarchy helper checks shared across cogs."""

from __future__ import annotations

import discord


def is_owner(user_id: int, owner_ids: list[int]) -> bool:
    return user_id in owner_ids


def member_top_role_position(member: discord.Member) -> int:
    return member.top_role.position


def can_moderate(actor: discord.Member, target: discord.Member) -> tuple[bool, str | None]:
    """
    Returns (allowed, reason_if_denied).
    Enforces standard Discord role-hierarchy safety rules so the bot never
    lets a moderator act on someone equal/above them, and never lets anyone
    (including admins) target the guild owner.
    """
    guild = actor.guild

    if target.id == guild.owner_id:
        return False, "You cannot moderate the server owner."

    if actor.id == guild.owner_id:
        pass  # owner can moderate anyone else
    elif actor.top_role.position <= target.top_role.position:
        return False, "You cannot moderate someone with an equal or higher role than you."

    return True, None


def bot_can_moderate(guild: discord.Guild, target: discord.Member) -> tuple[bool, str | None]:
    """Checks whether the bot itself has a high enough role to act on the target."""
    me = guild.me
    if target.id == guild.owner_id:
        return False, "I cannot moderate the server owner."
    if me.top_role.position <= target.top_role.position:
        return False, "My role is not high enough to moderate that member."
    return True, None


def has_manage_guild(member: discord.Member) -> bool:
    return member.guild_permissions.manage_guild


def has_admin(member: discord.Member) -> bool:
    return member.guild_permissions.administrator
