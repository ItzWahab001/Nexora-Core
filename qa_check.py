"""Offline QA checks for the Discord bot.
No Discord token or external API is used.
Exit code 0 means all offline checks passed.
"""
from __future__ import annotations

import ast
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).parent
errors: list[str] = []

# 1) Syntax/AST parse every Python file.
py_files = sorted(ROOT.rglob("*.py"))
for path in py_files:
    try:
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except SyntaxError as exc:
        errors.append(f"Syntax error: {path}: {exc}")

# 2) Verify application-command names are unique.
commands: list[tuple[str, str]] = []
for path in py_files:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except SyntaxError:
        continue
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for dec in node.decorator_list:
            if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
                if isinstance(dec.func.value, ast.Name) and dec.func.value.id == "app_commands" and dec.func.attr == "command":
                    for kw in dec.keywords:
                        if kw.arg == "name" and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                            commands.append((kw.value.value, str(path)))

seen: dict[str, str] = {}
for name, path in commands:
    if name in seen:
        errors.append(f"Duplicate application command '{name}' in {seen[name]} and {path}")
    seen[name] = path

# 3) Required deployment files/entries.
for required in ("bot.py", "config.py", "requirements.txt", "Dockerfile", ".env.example", "database/db.py"):
    if not (ROOT / required).exists():
        errors.append(f"Missing required file: {required}")

# 4) Dependency declarations for voice/music.
requirements = (ROOT / "requirements.txt").read_text(encoding="utf-8")
for token in ("discord.py[voice]", "davey", "PyNaCl", "yt-dlp"):
    if token.lower() not in requirements.lower():
        errors.append(f"Missing dependency declaration: {token}")

# 5) Production container must provide FFmpeg.
dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
if "apt-get install" not in dockerfile or "ffmpeg" not in dockerfile:
    errors.append("Dockerfile does not install FFmpeg")

# 6) Secrets must not be hardcoded in Python source.
secret_pattern = re.compile(r"(?:DISCORD_TOKEN|GEMINI_API_KEY|AI_API_KEY|TTS_API_KEY)\s*=\s*[\"'](?!\$|your_|YOUR_|\{).+?[\"']", re.I)
for path in py_files:
    text = path.read_text(encoding="utf-8")
    if secret_pattern.search(text):
        errors.append(f"Possible hardcoded secret in {path}")

# 7) Optional local capability report.
print(f"Python files: {len(py_files)}")
print(f"Application commands discovered: {len(commands)}")
print(f"FFmpeg on PATH: {'YES' if shutil.which('ffmpeg') else 'NO (Railway Docker installs it)'}")
print("Offline checks: PASS" if not errors else "Offline checks: FAIL")

if errors:
    for err in errors:
        print("ERROR:", err)
    sys.exit(1)
