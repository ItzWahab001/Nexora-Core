import asyncio, random
from datetime import datetime, timedelta, timezone
import discord
from discord.ext import commands
from utils.embeds import embed
from views.giveaways import GiveawayView

class Giveaways(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.tasks = {}
        self.finish_loop.start()

    def cog_unload(self): self.finish_loop.cancel()

    @commands.hybrid_command(name="giveaway")
    @commands.has_guild_permissions(manage_guild=True)
    async def giveaway(self, ctx, duration_seconds: int, winners: int, *, prize: str):
        if duration_seconds < 10 or winners < 1:
            return await ctx.send("Use at least 10 seconds and one winner.")
        ends = datetime.now(timezone.utc) + timedelta(seconds=duration_seconds)
        cur = await self.bot.db.execute("INSERT INTO giveaways(guild_id,channel_id,prize,winners,ends_at) VALUES(?,?,?,?,?)",
                                        (ctx.guild.id, ctx.channel.id, prize, winners, ends.isoformat()))
        gid = cur.lastrowid
        msg = await ctx.send(embed=embed("🎁 Giveaway", f"**Prize:** {prize}\n**Winners:** {winners}\n**Ends:** <t:{int(ends.timestamp())}:R>"),
                             view=GiveawayView(self.bot))
        await self.bot.db.execute("UPDATE giveaways SET message_id=? WHERE id=?", (msg.id, gid))
        await ctx.send(f"Giveaway #{gid} created.", delete_after=5)

    async def enter(self, interaction):
        msg = await self.bot.db.fetchone("SELECT * FROM giveaways WHERE message_id=? AND status='active'", (interaction.message.id,))
        if not msg: return await interaction.response.send_message("This giveaway is no longer active.", ephemeral=True)
        await self.bot.db.execute("INSERT OR IGNORE INTO giveaway_entries(giveaway_id,user_id) VALUES(?,?)",
                                  (msg["id"], interaction.user.id))
        await interaction.response.send_message("🎟️ Entry recorded!", ephemeral=True)

    @commands.hybrid_command(name="giveaway-reroll")
    @commands.has_guild_permissions(manage_guild=True)
    async def reroll(self, ctx, giveaway_id: int):
        await self._finish(giveaway_id, reroll=True, channel=ctx.channel)
        await ctx.send("Reroll processed.")

    @commands.hybrid_command(name="giveaway-cancel")
    @commands.has_guild_permissions(manage_guild=True)
    async def cancel(self, ctx, giveaway_id: int):
        await self.bot.db.execute("UPDATE giveaways SET status='cancelled' WHERE id=? AND guild_id=?", (giveaway_id,ctx.guild.id))
        await ctx.send("Giveaway cancelled.")

    @commands.Cog.listener()
    async def on_ready(self):
        for row in await self.bot.db.fetchall("SELECT id,ends_at FROM giveaways WHERE status='active'"):
            pass

    @commands.tasks.loop(seconds=5)
    async def finish_loop(self):
        rows = await self.bot.db.fetchall("SELECT * FROM giveaways WHERE status='active'")
        now = datetime.now(timezone.utc)
        for row in rows:
            try: ends = datetime.fromisoformat(row["ends_at"])
            except ValueError: continue
            if ends <= now:
                guild = self.bot.get_guild(row["guild_id"])
                channel = guild.get_channel(row["channel_id"]) if guild else None
                await self._finish(row["id"], channel=channel)

    async def _finish(self, giveaway_id, reroll=False, channel=None):
        row = await self.bot.db.fetchone("SELECT * FROM giveaways WHERE id=?", (giveaway_id,))
        if not row: return
        entries = await self.bot.db.fetchall("SELECT user_id FROM giveaway_entries WHERE giveaway_id=?", (giveaway_id,))
        pool = [e["user_id"] for e in entries]
        if not pool: winners = []
        else: winners = random.sample(pool, min(row["winners"], len(pool)))
        if not reroll:
            await self.bot.db.execute("UPDATE giveaways SET status='ended' WHERE id=?", (giveaway_id,))
        ch = channel
        if not ch:
            guild = self.bot.get_guild(row["guild_id"]); ch = guild.get_channel(row["channel_id"]) if guild else None
        if ch:
            mentions = ", ".join(f"<@{u}>" for u in winners) or "No valid entries."
            await ch.send(embed=embed("🎉 Giveaway Ended", f"**{row['prize']}**\nWinners: {mentions}"))

async def setup(bot): await bot.add_cog(Giveaways(bot))
