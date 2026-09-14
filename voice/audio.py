import asyncio
from pathlib import Path
import discord

class AudioQueue:
    def __init__(self, voice_client):
        self.voice_client = voice_client
        self.queue = asyncio.Queue()
        self.task = asyncio.create_task(self._worker())

    async def put(self, path: Path):
        await self.queue.put(path)

    async def _worker(self):
        while True:
            path = await self.queue.get()
            try:
                while self.voice_client.is_playing():
                    await asyncio.sleep(0.25)
                source = discord.FFmpegPCMAudio(str(path))
                done = asyncio.Event()
                def after(error):
                    if error:
                        pass
                    self.voice_client.loop.call_soon_threadsafe(done.set)
                self.voice_client.play(source, after=after)
                await done.wait()
            finally:
                self.queue.task_done()

    async def close(self):
        self.task.cancel()
        try:
            await self.task
        except asyncio.CancelledError:
            pass
