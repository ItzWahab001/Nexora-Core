"""Application-wide logging setup. Never logs the bot token or API keys."""

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler

from config import config


def setup_logging() -> logging.Logger:
    os.makedirs(os.path.dirname(config.log_file) or ".", exist_ok=True)

    root = logging.getLogger()
    root.setLevel(config.log_level)

    fmt = logging.Formatter(
        "[{asctime}] [{levelname:<8}] {name}: {message}",
        "%Y-%m-%d %H:%M:%S",
        style="{",
    )

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)
    root.addHandler(console)

    file_handler = RotatingFileHandler(
        config.log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    logging.getLogger("discord.http").setLevel(logging.WARNING)
    logging.getLogger("discord.gateway").setLevel(logging.WARNING)
    logging.getLogger("discord.client").setLevel(logging.WARNING)

    return logging.getLogger("bot")


logger = setup_logging()
