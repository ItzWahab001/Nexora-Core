import shutil
import sys
import discord
import yt_dlp
import openai

ffmpeg = shutil.which("ffmpeg")
node = shutil.which("node")
if not ffmpeg:
    raise SystemExit("FFmpeg missing")
if not node:
    raise SystemExit("Node.js missing")
print("OK: discord.py", discord.__version__)
print("OK: yt-dlp", yt_dlp.version.__version__)
print("OK: openai", getattr(openai, "__version__", "unknown"))
print("OK: ffmpeg", ffmpeg)
print("OK: node", node)
