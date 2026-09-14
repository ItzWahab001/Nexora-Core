import discord
from discord.ext import commands
from utils.embeds import embed

class Statistics(commands.Cog):
    def __init__(self,bot): self.bot=bot
    @commands.hybrid_command(name="stats")
    async def stats(self,ctx):
        g=ctx.guild
        verified=await self.bot.db.fetchone("SELECT COUNT(*) c FROM verification WHERE guild_id=?",(g.id,))
        tickets=await self.bot.db.fetchone("SELECT COUNT(*) c FROM tickets WHERE guild_id=?",(g.id,))
        apps=await self.bot.db.fetchone("SELECT COUNT(*) c FROM applications WHERE guild_id=?",(g.id,))
        giveaways=await self.bot.db.fetchone("SELECT COUNT(*) c FROM giveaways WHERE guild_id=?",(g.id,))
        uptime=discord.utils.utcnow()-self.bot.start_time
        e=embed("📊 Server Statistics",f"Members: **{g.member_count}**\nBots: **{sum(m.bot for m in g.members)}**\nHumans: **{sum(not m.bot for m in g.members)}**\nChannels: **{len(g.channels)}**\nRoles: **{len(g.roles)}**\nVerified: **{verified['c']}**\nTickets: **{tickets['c']}**\nApplications: **{apps['c']}**\nGiveaways: **{giveaways['c']}**\nBot uptime: **{uptime}**")
        await ctx.send(embed=e)

async def setup(bot): await bot.add_cog(Statistics(bot))
