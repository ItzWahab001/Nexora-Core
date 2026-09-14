import discord
from discord.ext import commands
from utils.embeds import embed

class Moderation(commands.Cog):
    def __init__(self, bot): self.bot=bot

    async def case(self, guild, user, moderator, action, reason):
        cur = await self.bot.db.execute("INSERT INTO moderation_cases(guild_id,user_id,moderator_id,action,reason) VALUES(?,?,?,?,?)",
                                        (guild.id,user.id,moderator.id,action,reason))
        return cur.lastrowid

    @commands.hybrid_command(name="ban")
    @commands.has_guild_permissions(ban_members=True)
    async def ban(self, ctx, member: discord.Member, *, reason="No reason provided"):
        await member.ban(reason=reason); cid=await self.case(ctx.guild,member,ctx.author,"ban",reason)
        await ctx.send(embed=embed("🔨 Ban", f"{member} banned. Case #{cid}\nReason: {reason}"))

    @commands.hybrid_command(name="kick")
    @commands.has_guild_permissions(kick_members=True)
    async def kick(self, ctx, member: discord.Member, *, reason="No reason provided"):
        await member.kick(reason=reason); cid=await self.case(ctx.guild,member,ctx.author,"kick",reason)
        await ctx.send(embed=embed("👢 Kick", f"{member} kicked. Case #{cid}\nReason: {reason}"))

    @commands.hybrid_command(name="timeout")
    @commands.has_guild_permissions(moderate_members=True)
    async def timeout(self, ctx, member: discord.Member, minutes: int, *, reason="No reason provided"):
        await member.timeout(discord.utils.utcnow()+__import__('datetime').timedelta(minutes=minutes), reason=reason)
        cid=await self.case(ctx.guild,member,ctx.author,"timeout",reason)
        await ctx.send(embed=embed("⏱️ Timeout", f"{member} timed out. Case #{cid}"))

    @commands.hybrid_command(name="warn")
    @commands.has_guild_permissions(moderate_members=True)
    async def warn(self, ctx, member: discord.Member, *, reason="No reason provided"):
        cur=await self.bot.db.execute("INSERT INTO warnings(guild_id,user_id,moderator_id,reason) VALUES(?,?,?,?)",
                                      (ctx.guild.id,member.id,ctx.author.id,reason))
        await self.case(ctx.guild,member,ctx.author,"warn",reason)
        await ctx.send(f"⚠️ {member.mention} warned. Warning #{cur.lastrowid}")

    @commands.hybrid_command(name="warnings")
    @commands.has_guild_permissions(moderate_members=True)
    async def warnings(self, ctx, member: discord.Member):
        rows=await self.bot.db.fetchall("SELECT id,reason,created_at FROM warnings WHERE guild_id=? AND user_id=? ORDER BY id DESC",
                                        (ctx.guild.id,member.id))
        text="\n".join(f"#{r['id']} — {r['reason']} — {r['created_at']}" for r in rows) or "No warnings."
        await ctx.send(embed=embed(f"Warnings: {member}",text))

    @commands.hybrid_command(name="clear")
    @commands.has_guild_permissions(manage_messages=True)
    async def clear(self, ctx, amount: int):
        amount=max(1,min(amount,100))
        deleted=await ctx.channel.purge(limit=amount+1)
        await ctx.send(f"Deleted {len(deleted)-1} messages.",delete_after=4)

    @commands.hybrid_command(name="slowmode")
    @commands.has_guild_permissions(manage_channels=True)
    async def slowmode(self, ctx, seconds: int):
        await ctx.channel.edit(slowmode_delay=max(0,min(seconds,21600)))
        await ctx.send(f"Slowmode set to {seconds}s.")

    @commands.hybrid_command(name="lock")
    @commands.has_guild_permissions(manage_channels=True)
    async def lock(self, ctx):
        await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=False)
        await ctx.send("🔒 Channel locked.")

    @commands.hybrid_command(name="unlock")
    @commands.has_guild_permissions(manage_channels=True)
    async def unlock(self, ctx):
        await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=None)
        await ctx.send("🔓 Channel unlocked.")

async def setup(bot): await bot.add_cog(Moderation(bot))
