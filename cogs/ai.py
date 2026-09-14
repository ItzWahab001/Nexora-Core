import os, time
import aiohttp
from discord.ext import commands

class AI(commands.Cog):
    def __init__(self, bot):
        self.bot=bot
        self.last={}
    @commands.hybrid_command(name="ai")
    async def ai(self, ctx, *, prompt: str):
        s=await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?",(ctx.guild.id,))
        if s and s["ai_channel_id"] and ctx.channel.id != s["ai_channel_id"]:
            return await ctx.send("AI chat is configured for another channel.")
        cooldown=int(s["ai_cooldown"] if s else 5)
        if time.monotonic()-self.last.get(ctx.author.id,0)<cooldown:
            return await ctx.send("Please wait before sending another AI request.")
        self.last[ctx.author.id]=time.monotonic()
        key=os.getenv("AI_API_KEY"); base=os.getenv("AI_BASE_URL","https://api.openai.com/v1").rstrip("/")
        model=os.getenv("AI_MODEL","gpt-4o-mini")
        if not key: return await ctx.send("AI_API_KEY is not configured.")
        headers={"Authorization":f"Bearer {key}","Content-Type":"application/json"}
        payload={"model":model,"messages":[{"role":"user","content":prompt}],"temperature":0.7}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{base}/chat/completions",headers=headers,json=payload,timeout=60) as r:
                    data=await r.json()
                    if r.status>=400: return await ctx.send("AI provider returned an error.")
            text=data["choices"][0]["message"]["content"]
            await ctx.send(text[:1900])
        except Exception:
            await ctx.send("AI request failed. Check provider settings and logs.")

async def setup(bot): await bot.add_cog(AI(bot))
