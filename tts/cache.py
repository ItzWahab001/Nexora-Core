"""
Simple on-disk cache for generated audio, so re-running the same
onboarding script (e.g. "Welcome to {server}, please verify") doesn't
re-hit the TTS API every single time.
"""
import hashlib
import logging
import os

logger = logging.getLogger("tts.cache")

CACHE_DIR = "data/tts_cache"


def _key(provider_name: str, voice: str, text: str) -> str:
    raw = f"{provider_name}|{voice}|{text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def get_cache_path(provider_name: str, voice: str, text: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    return os.path.join(CACHE_DIR, f"{_key(provider_name, voice, text)}.mp3")


def read_cached(provider_name: str, voice: str, text: str) -> bytes | None:
    path = get_cache_path(provider_name, voice, text)
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()
    return None


def write_cache(provider_name: str, voice: str, text: str, data: bytes):
    path = get_cache_path(provider_name, voice, text)
    try:
        with open(path, "wb") as f:
            f.write(data)
    except OSError:
        logger.exception("Failed writing TTS cache file")
