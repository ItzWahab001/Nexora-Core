"""
TTSProvider interface — every voice backend implements this so the
voice onboarding system never depends on a specific vendor.
"""
from abc import ABC, abstractmethod


class TTSProvider(ABC):
    """Common interface for all text-to-speech providers."""

    name: str = "base"

    @abstractmethod
    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        """
        Convert `text` to speech and return raw audio bytes (MP3/OGG).
        Must raise TTSError on failure — never return silently-empty audio.
        """
        raise NotImplementedError


class TTSError(Exception):
    """Raised when a provider fails to synthesize audio."""
