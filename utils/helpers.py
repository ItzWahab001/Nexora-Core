"""Small, generic, stateless helper functions used across the codebase."""

from __future__ import annotations

import re
import datetime as dt

DURATION_RE = re.compile(r"(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)", re.IGNORECASE)

_UNIT_SECONDS = {
    "s": 1, "sec": 1, "secs": 1, "second": 1, "seconds": 1,
    "m": 60, "min": 60, "mins": 60, "minute": 60, "minutes": 60,
    "h": 3600, "hr": 3600, "hrs": 3600, "hour": 3600, "hours": 3600,
    "d": 86400, "day": 86400, "days": 86400,
    "w": 604800, "week": 604800, "weeks": 604800,
}


def parse_duration(text: str) -> int | None:
    """Parses strings like '10m', '1h30m', '2 days' into total seconds. Returns None if unparsable."""
    text = text.strip()
    if not text:
        return None
    matches = DURATION_RE.findall(text)
    if not matches:
        return None
    total = 0
    for amount, unit in matches:
        total += int(amount) * _UNIT_SECONDS[unit.lower()]
    return total if total > 0 else None


def format_seconds(seconds: int) -> str:
    """Formats a duration in seconds as e.g. '3:45' or '1:02:03'."""
    seconds = max(0, int(seconds))
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def format_relative(dt_obj: dt.datetime) -> str:
    """Discord relative timestamp markdown, e.g. <t:169...:R>."""
    return f"<t:{int(dt_obj.timestamp())}:R>"


def format_absolute(dt_obj: dt.datetime) -> str:
    return f"<t:{int(dt_obj.timestamp())}:F>"


def truncate(text: str, limit: int = 1024) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def chunk_list(items: list, size: int) -> list[list]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def progress_bar(current: float, total: float, length: int = 20) -> str:
    if total <= 0:
        filled = 0
    else:
        filled = int(length * max(0, min(current, total)) / total)
    return "▰" * filled + "▱" * (length - filled)
