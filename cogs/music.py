import asyncio
import discord
from discord.ext import commands

class Music(commands.Cog):
    def __init__(self, bot):
        self.bot=bot
        self.queues={}
        self.loops={}

    async def ensure_voice(self, ctx):
        if not ctx.author.voice: raise RuntimeError("Join a voice channel first.")
        vc=ctx.guild.voice_client
        if not vc: vc=await ctx.author.voice.channel.connect(reconnect=True)
        elif vc.channel.id != ctx.author.voice.channel.id: await vc.move_to(ctx.author.voice.channel)
        return vc

    @commands.hybrid_command(name="play")
    async def play(self, ctx, *, query: str):
        try:
            vc=await self.ensure_voice(ctx)
            await ctx.defer()
            from yt_dlp import YoutubeDL
            opts={"format":"bestaudio/best","noplaylist":True,"quiet":True}
            with YoutubeDL(opts) as ydl:
                info=await asyncio.to_thread(ydl.extract_info, query, download=False)
            url=info["url"]; title=info.get("title","Unknown")
            if vc.is_playing(): vc.stop()
            source=discord.FFmpegPCMAudio(url, before_options="-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5")
            vc.play(source)
            await ctx.followup.send(f"▶️ Playing **{title}**")
        except Exception as e:
            await ctx.send(f"Music error: {e}")

    @commands.hybrid_command(name="pause")
    async def pause(self, ctx):
        if ctx.guild.voice_client and ctx.guild.voice_client.is_playing(): ctx.guild.voice_client.pause()
        await ctx.send("⏸️ Paused.")

    @commands.hybrid_command(name="resume")
    async def resume(self, ctx):
        if ctx.guild.voice_client and ctx.guild.voice_client.is_paused(): ctx.guild.voice_client.resume()
        await ctx.send("▶️ Resumed.")

    @commands.hybrid_command(name="skip")
    async def skip(self, ctx):
        if ctx.guild.voice_client: ctx.guild.voice_client.stop()
        await ctx.send("⏭️ Skipped.")

    @commands.hybrid_command(name="stop")
    async def stop(self, ctx):
        if ctx.guild.voice_client: await ctx.guild.voice_client.disconnect()
        await ctx.send("⏹️ Stopped.")

async def setup(bot): await bot.add_cog(Music(bot))
