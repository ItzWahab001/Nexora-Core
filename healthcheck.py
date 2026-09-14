from __future__ import annotations

import shutil
import sys

import discord
import openai
import yt_dlp


def fail(message: str) -> None:
    print(f"FATAL: {message}", file=sys.stderr)
    raise SystemExit(1)


ffmpeg = shutil.which("ffmpeg")
node = shutil.which("node")
if not ffmpeg:
    fail("FFmpeg is missing")
if not node:
    fail("Node.js 22+ is missing")

try:
    import davey
except Exception as exc:
    fail(f"davey is missing/unimportable: {exc}")

try:
    from discord import VoiceClient
except Exception as exc:
    fail(f"discord.py voice support is unavailable: {exc}")

print("OK: discord.py", discord.__version__)
print("OK: davey", getattr(davey, "__version__", "installed"))
print("OK: yt-dlp", yt_dlp.version.__version__)
print("OK: openai", getattr(openai, "__version__", "unknown"))
print("OK: ffmpeg", ffmpeg)
print("OK: node", node)
print("OK: Discord voice imports")
