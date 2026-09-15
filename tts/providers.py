"""
Concrete TTSProvider implementations.

- EdgeTTSProvider: free, no API key, uses Microsoft Edge's public TTS
  service via the `edge-tts` library. Good default so the bot works
  out of the box with zero configuration.
- ElevenLabsProvider / OpenAITTSProvider: real paid APIs, activated by
  setting TTS_PROVIDER + TTS_API_KEY in .env.

Swap providers purely via config — nothing else in the codebase changes.
"""
import io
import logging

import aiohttp

from tts.base import TTSProvider, TTSError

logger = logging.getLogger("tts")


class EdgeTTSProvider(TTSProvider):
    name = "edge"

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        try:
            import edge_tts
        except ImportError as e:
            raise TTSError("edge-tts is not installed. Run: pip install edge-tts") from e

        voice = voice or "en-US-GuyNeural"
        buf = io.BytesIO()
        try:
            communicate = edge_tts.Communicate(text, voice)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    buf.write(chunk["data"])
        except Exception as e:
            raise TTSError(f"Edge TTS failed: {e}") from e

        data = buf.getvalue()
        if not data:
            raise TTSError("Edge TTS returned empty audio")
        return data


class ElevenLabsProvider(TTSProvider):
    name = "elevenlabs"

    def __init__(self, api_key: str):
        if not api_key:
            raise TTSError("ElevenLabs provider requires TTS_API_KEY")
        self.api_key = api_key

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        voice_id = voice or "21m00Tcm4TlvDq8ikWAM"  # ElevenLabs default "Rachel"
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {"xi-api-key": self.api_key, "Content-Type": "application/json"}
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise TTSError(f"ElevenLabs API error {resp.status}: {body}")
                return await resp.read()


class OpenAITTSProvider(TTSProvider):
    name = "openai"

    def __init__(self, api_key: str):
        if not api_key:
            raise TTSError("OpenAI TTS provider requires TTS_API_KEY")
        self.api_key = api_key

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        url = "https://api.openai.com/v1/audio/speech"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"model": "tts-1", "voice": voice or "alloy", "input": text, "response_format": "mp3"}
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise TTSError(f"OpenAI TTS API error {resp.status}: {body}")
                return await resp.read()


def get_provider(provider_name: str, api_key: str = "") -> TTSProvider:
    provider_name = (provider_name or "edge").lower()
    if provider_name == "edge":
        return EdgeTTSProvider()
    if provider_name == "elevenlabs":
        return ElevenLabsProvider(api_key)
    if provider_name == "openai":
        return OpenAITTSProvider(api_key)
    logger.warning(f"Unknown TTS_PROVIDER '{provider_name}', falling back to edge-tts")
    return EdgeTTSProvider()
