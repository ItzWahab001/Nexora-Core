"""
Central configuration loader.
All secrets come from environment variables (.env) — never hardcoded.
"""
import os
import logging
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


def _get(name: str, default: str | None = None) -> str | None:
    val = os.getenv(name, default)
    return val if val != "" else default


@dataclass(frozen=True)
class Config:
    discord_token: str = _get("DISCORD_TOKEN", "")
    default_prefix: str = _get("DEFAULT_PREFIX", "!")
    database_path: str = _get("DATABASE_PATH", "data/bot.db")

    tts_provider: str = _get("TTS_PROVIDER", "edge")
    tts_api_key: str = _get("TTS_API_KEY", "")
    tts_voice: str = _get("TTS_VOICE", "en-US-GuyNeural")

    ai_api_key: str = _get("AI_API_KEY", "")
    ai_base_url: str = _get("AI_BASE_URL", "https://api.anthropic.com")
    ai_model: str = _get("AI_MODEL", "claude-sonnet-4-5")

    log_level: str = _get("LOG_LEVEL", "INFO")


CONFIG = Config()


def setup_logging():
    os.makedirs("logs", exist_ok=True)
    level = getattr(logging, CONFIG.log_level.upper(), logging.INFO)
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    handlers = [
        logging.StreamHandler(),
        logging.FileHandler("logs/bot.log", encoding="utf-8"),
    ]
    logging.basicConfig(level=level, format=fmt, handlers=handlers)
    # discord.py is chatty at INFO, tone it down a bit
    logging.getLogger("discord").setLevel(logging.WARNING)
    logging.getLogger("discord.http").setLevel(logging.WARNING)
