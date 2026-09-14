import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

def setup_logging():
    Path("data/logs").mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler("data/logs/bot.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8")
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[handler, logging.StreamHandler()],
    )
