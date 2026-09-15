"""Offline deployment smoke test. Does not contact Discord or third-party APIs."""
from __future__ import annotations
import importlib.util
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REQUIRED = [
    "discord", "dotenv", "aiosqlite", "nacl", "yt_dlp", "aiohttp",
    "anthropic", "edge_tts", "mutagen",
]

print("=== Discord Bot Offline Smoke Test ===")
print(f"Python: {sys.version.split()[0]}")
print(f"FFmpeg: {shutil.which('ffmpeg') or 'NOT FOUND'}")

missing = []
for mod in REQUIRED:
    if importlib.util.find_spec(mod) is None:
        missing.append(mod)
        print(f"[MISSING] {mod}")
    else:
        print(f"[OK]      {mod}")

py_files = list(ROOT.rglob("*.py"))
print(f"Python files: {len(py_files)}")

if missing:
    print("\nResult: BLOCKED — install requirements.txt before running the bot.")
    sys.exit(2)

if shutil.which("ffmpeg") is None:
    print("\nResult: BLOCKED — FFmpeg is required for music playback.")
    sys.exit(3)

print("\nResult: PASS — offline dependencies and FFmpeg are available.")
print("Live Discord/API tests still require credentials and network access.")
