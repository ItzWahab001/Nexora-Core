import time
import discord
from discord.ext import commands
from utils.permissions import can_manage

class CustomCommands(commands.Cog):
    def __init__(self,bot):
        self.bot=bot; self.cooldowns={}
    @commands.Cog.listener()
    async def on_message(self,message):
        if message.author.bot or not message.guild: return
        row=await self.bot.db.fetchone("SELECT * FROM custom_commands WHERE guild_id=? AND name=?",(message.guild.id,message.content.split()[0][1:] if message.content.startswith("!") else ""))
        if not row: return
        if row["role_id"] and not any(r.id==row["role_id"] for r in message.author.roles) and not message.author.guild_permissions.administrator: return
        key=(message.guild.id,message.author.id,row["name"])
        if time.monotonic()-self.cooldowns.get(key,0)<row["cooldown"]: return
        self.cooldowns[key]=time.monotonic()
        text=row["response"].format(user=message.author.mention,username=message.author.display_name,server=message.guild.name)
        await message.channel.send(text)
    @commands.hybrid_command(name="custom-add")
    @commands.has_guild_permissions(manage_guild=True)
    async def add(self,ctx,name:str,*,response:str):
        await self.bot.db.execute("INSERT INTO custom_commands(guild_id,name,response) VALUES(?,?,?) ON CONFLICT(guild_id,name) DO UPDATE SET response=excluded.response",(ctx.guild.id,name.lower(),response))
        await ctx.send(f"Custom command `!{name}` saved.")
    @commands.hybrid_command(name="custom-remove")
    @commands.has_guild_permissions(manage_guild=True)
    async def remove(self,ctx,name:str):
        await self.bot.db.execute("DELETE FROM custom_commands WHERE guild_id=? AND name=?",(ctx.guild.id,name.lower()))
        await ctx.send("Custom command removed.")

async def setup(bot): await bot.add_cog(CustomCommands(bot))
