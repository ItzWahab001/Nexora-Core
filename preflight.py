"""Offline deployment preflight; does not contact Discord or external APIs."""
import importlib.util
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
print("== Discord Bot Preflight ==")
print("Python files:", len(list(ROOT.rglob("*.py"))))
print("FFmpeg:", shutil.which("ffmpeg") or "MISSING")
for mod in ("discord", "aiosqlite", "nacl", "yt_dlp", "aiohttp", "edge_tts"):
    print(f"{mod}:", "OK" if importlib.util.find_spec(mod) else "MISSING")

required = ["DISCORD_TOKEN"]
text = (ROOT / ".env.example").read_text(encoding="utf-8")
for key in required:
    print(f"{key} documented:", key in text)
