import discord
from discord.ext import commands
from utils.embeds import embed
from views.applications import ApplicationPanelView

class Applications(commands.Cog):
    def __init__(self, bot): self.bot = bot

    @commands.hybrid_command(name="application-panel")
    @commands.has_guild_permissions(manage_guild=True)
    async def panel(self, ctx):
        await ctx.send(embed=embed("📝 Applications", "Submit an application using the button below."),
                       view=ApplicationPanelView(self.bot))

    async def submit(self, interaction, a1, a2):
        answers = f"Why join: {a1}\n\nAbout: {a2}"
        cur = await self.bot.db.execute("INSERT INTO applications(guild_id,user_id,answers) VALUES(?,?,?)",
                                        (interaction.guild.id, interaction.user.id, answers))
        await interaction.response.send_message("Application submitted. Staff will review it.", ephemeral=True)

    @commands.hybrid_command(name="applications")
    @commands.has_guild_permissions(manage_guild=True)
    async def applications(self, ctx):
        rows = await self.bot.db.fetchall("SELECT id,user_id,status FROM applications WHERE guild_id=? ORDER BY id DESC LIMIT 15",
                                          (ctx.guild.id,))
        text = "\n".join(f"#{r['id']} — <@{r['user_id']}> — {r['status']}" for r in rows) or "No applications."
        await ctx.send(embed=embed("Application History", text))

    @commands.hybrid_command(name="application-review")
    @commands.has_guild_permissions(manage_guild=True)
    async def review(self, ctx, application_id: int, decision: str):
        decision = decision.lower()
        if decision not in ("accept","deny"):
            return await ctx.send("Decision must be accept or deny.")
        row = await self.bot.db.fetchone("SELECT * FROM applications WHERE id=? AND guild_id=?", (application_id, ctx.guild.id))
        if not row: return await ctx.send("Application not found.")
        await self.bot.db.execute("UPDATE applications SET status=?,reviewer_id=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?",
                                  (decision, ctx.author.id, application_id))
        user = ctx.guild.get_member(row["user_id"])
        if user:
            try: await user.send(f"Your application in {ctx.guild.name} was **{decision}ed**.")
            except discord.HTTPException: pass
        await ctx.send(f"Application #{application_id} marked {decision}.")

async def setup(bot): await bot.add_cog(Applications(bot))
