import asyncio
import discord

class VoiceManager:
    def __init__(self, bot):
        self.bot = bot
        self.connections = {}
        self.locks = {}

    async def connect(self, guild: discord.Guild, channel: discord.VoiceChannel):
        lock = self.locks.setdefault(guild.id, asyncio.Lock())
        async with lock:
            existing = guild.voice_client
            if existing and existing.is_connected():
                if existing.channel.id != channel.id:
                    await existing.move_to(channel)
                self.connections[guild.id] = existing
                return existing
            vc = await channel.connect(reconnect=True, timeout=20)
            self.connections[guild.id] = vc
            return vc

    async def disconnect(self, guild):
        vc = guild.voice_client
        if vc:
            await vc.disconnect(force=True)
        self.connections.pop(guild.id, None)
