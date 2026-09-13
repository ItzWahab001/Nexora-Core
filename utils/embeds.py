"""Reusable embed builders so every panel/command shares one visual style."""

from __future__ import annotations

import datetime as dt

import discord

from config import config


def base_embed(
    title: str | None = None,
    description: str | None = None,
    color: int | None = None,
) -> discord.Embed:
    embed = discord.Embed(
        title=title,
        description=description,
        color=color if color is not None else config.embed_color,
        timestamp=dt.datetime.now(dt.timezone.utc),
    )
    return embed


def success_embed(title: str, description: str | None = None) -> discord.Embed:
    return base_embed(f"✅ {title}", description, config.success_color)


def error_embed(title: str, description: str | None = None) -> discord.Embed:
    return base_embed(f"❌ {title}", description, config.error_color)


def warning_embed(title: str, description: str | None = None) -> discord.Embed:
    return base_embed(f"⚠️ {title}", description, config.warning_color)


def info_embed(title: str, description: str | None = None) -> discord.Embed:
    return base_embed(f"ℹ️ {title}", description, config.embed_color)


def footer_with_user(embed: discord.Embed, user: discord.abc.User) -> discord.Embed:
    embed.set_footer(text=f"Requested by {user}", icon_url=user.display_avatar.url)
    return embed
