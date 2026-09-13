"""
Thin wrapper around discord.py's moderation actions.

Centralizing ban/kick/timeout here means moderation.py (slash commands) and
automod.py (automatic punishments) both get identical, consistently-logged
behavior instead of two slightly different implementations.
"""

from __future__ import annotations

import datetime as dt
import logging

import discord

log = logging.getLogger("bot.services.moderation")


class ModerationService:
    async def ban(self, guild: discord.Guild, target: discord.abc.Snowflake, reason: str, delete_message_days: int = 0) -> None:
        await guild.ban(target, reason=reason, delete_message_seconds=delete_message_days * 86400)

    async def unban(self, guild: discord.Guild, user_id: int, reason: str) -> None:
        await guild.unban(discord.Object(id=user_id), reason=reason)

    async def kick(self, guild: discord.Guild, target: discord.Member, reason: str) -> None:
        await guild.kick(target, reason=reason)

    async def timeout(self, target: discord.Member, duration_seconds: int, reason: str) -> None:
        until = discord.utils.utcnow() + dt.timedelta(seconds=duration_seconds)
        await target.timeout(until, reason=reason)

    async def remove_timeout(self, target: discord.Member, reason: str) -> None:
        await target.timeout(None, reason=reason)


moderation_service = ModerationService()
