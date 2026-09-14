import asyncio
import hashlib
from pathlib import Path
import edge_tts

class TTSProvider:
    async def synthesize(self, text: str, voice: str, output: Path) -> Path:
        raise NotImplementedError

class EdgeTTSProvider(TTSProvider):
    async def synthesize(self, text, voice, output):
        output.parent.mkdir(parents=True, exist_ok=True)
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(output))
        return output

def cache_path(text, voice):
    digest = hashlib.sha256(f"{voice}\0{text}".encode()).hexdigest()
    return Path("data/tts") / f"{digest}.mp3"
