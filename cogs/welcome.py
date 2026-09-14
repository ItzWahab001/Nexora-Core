import discord
from discord.ext import commands
from utils.embeds import embed

class Welcome(commands.Cog):
    def __init__(self, bot): self.bot=bot
    @commands.Cog.listener()
    async def on_member_join(self, member):
        s=await self.bot.db.fetchone("SELECT welcome_channel_id,welcome_message FROM guild_settings WHERE guild_id=?",(member.guild.id,))
        if not s or not s["welcome_channel_id"]: return
        ch=member.guild.get_channel(s["welcome_channel_id"])
        if ch: await ch.send(embed=embed("👋 Welcome!", (s["welcome_message"] or "Welcome {username}!").format(
            username=member.mention,server_name=member.guild.name,member_number=member.guild.member_count)))
    @commands.Cog.listener()
    async def on_member_remove(self, member):
        s=await self.bot.db.fetchone("SELECT goodbye_channel_id FROM guild_settings WHERE guild_id=?",(member.guild.id,))
        if s and s["goodbye_channel_id"]:
            ch=member.guild.get_channel(s["goodbye_channel_id"])
            if ch: await ch.send(embed=embed("👋 Goodbye",f"{member} has left the server."))

    @commands.hybrid_command(name="welcome-channel")
    @commands.has_guild_permissions(manage_guild=True)
    async def welcome_channel(self,ctx,channel:discord.TextChannel):
        await self.bot.db.execute("INSERT INTO guild_settings(guild_id,welcome_channel_id) VALUES(?,?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel_id=excluded.welcome_channel_id",(ctx.guild.id,channel.id))
        await ctx.send("Welcome channel saved.")

    @commands.hybrid_command(name="goodbye-channel")
    @commands.has_guild_permissions(manage_guild=True)
    async def goodbye_channel(self,ctx,channel:discord.TextChannel):
        await self.bot.db.execute("INSERT INTO guild_settings(guild_id,goodbye_channel_id) VALUES(?,?) ON CONFLICT(guild_id) DO UPDATE SET goodbye_channel_id=excluded.goodbye_channel_id",(ctx.guild.id,channel.id))
        await ctx.send("Goodbye channel saved.")

async def setup(bot): await bot.add_cog(Welcome(bot))
