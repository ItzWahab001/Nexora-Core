"""
Central configuration loader.

Loads and validates environment variables from .env, and exposes them as
typed, importable constants used throughout the bot. Keeping this in one
module means every other file just does `from config import config`
instead of re-parsing os.environ everywhere.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _get_bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _get_int_list(name: str) -> list[int]:
    raw = os.getenv(name, "")
    out: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if part.isdigit():
            out.append(int(part))
    return out


@dataclass(frozen=True)
class Config:
    # Core
    discord_token: str
    dev_guild_id: int | None
    owner_ids: list[int] = field(default_factory=list)

    # AI
    ai_api_key: str | None = None
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o-mini"

    # Database
    database_path: str = "data/bot.db"

    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/bot.log"

    # Static branding
    embed_color: int = 0x5865F2
    success_color: int = 0x57F287
    error_color: int = 0xED4245
    warning_color: int = 0xFEE75C


def load_config() -> Config:
    token = os.getenv("DISCORD_TOKEN", "").strip()
    if not token or token == "your_discord_bot_token_here":
        print(
            "[FATAL] DISCORD_TOKEN is not set. Copy .env.example to .env and "
            "fill in your bot token before starting the bot.",
            file=sys.stderr,
        )
        sys.exit(1)

    dev_guild_raw = os.getenv("DEV_GUILD_ID", "").strip()
    dev_guild_id = int(dev_guild_raw) if dev_guild_raw.isdigit() else None

    return Config(
        discord_token=token,
        dev_guild_id=dev_guild_id,
        owner_ids=_get_int_list("OWNER_IDS"),
        ai_api_key=os.getenv("AI_API_KEY", "").strip() or None,
        ai_base_url=os.getenv("AI_BASE_URL", "https://api.openai.com/v1").strip(),
        ai_model=os.getenv("AI_MODEL", "gpt-4o-mini").strip(),
        database_path=os.getenv("DATABASE_PATH", "data/bot.db").strip(),
        log_level=os.getenv("LOG_LEVEL", "INFO").strip().upper(),
        log_file=os.getenv("LOG_FILE", "logs/bot.log").strip(),
    )


config = load_config()
