"""Consistent embed styling used across every panel/menu in the bot."""
import discord

BRAND_COLOR = discord.Color.from_rgb(88, 101, 242)   # blurple-ish premium tone
SUCCESS_COLOR = discord.Color.from_rgb(87, 242, 135)
DANGER_COLOR = discord.Color.from_rgb(237, 66, 69)
WARN_COLOR = discord.Color.from_rgb(250, 166, 26)


def base_embed(title: str, description: str = "", color: discord.Color = BRAND_COLOR) -> discord.Embed:
    embed = discord.Embed(title=title, description=description, color=color)
    return embed


def success_embed(title: str, description: str = "") -> discord.Embed:
    return base_embed(f"✅ {title}", description, SUCCESS_COLOR)


def error_embed(title: str, description: str = "") -> discord.Embed:
    return base_embed(f"❌ {title}", description, DANGER_COLOR)


def warn_embed(title: str, description: str = "") -> discord.Embed:
    return base_embed(f"⚠️ {title}", description, WARN_COLOR)


def panel_embed(title: str, description: str, fields: list[tuple[str, str, bool]] | None = None) -> discord.Embed:
    embed = base_embed(title, description)
    for name, value, inline in (fields or []):
        embed.add_field(name=name, value=value or "—", inline=inline)
    return embed
