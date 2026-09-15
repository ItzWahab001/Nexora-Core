import time

import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.embeds import panel_embed


def format_uptime(seconds: float) -> str:
    seconds = int(seconds)
    d, seconds = divmod(seconds, 86400)
    h, seconds = divmod(seconds, 3600)
    m, s = divmod(seconds, 60)
    parts = []
    if d:
        parts.append(f"{d}d")
    if h:
        parts.append(f"{h}h")
    if m:
        parts.append(f"{m}m")
    parts.append(f"{s}s")
    return " ".join(parts)


class Statistics(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db

    @app_commands.command(name="stats", description="Show the server statistics dashboard")
    async def stats(self, interaction: discord.Interaction):
        guild = interaction.guild
        await interaction.response.defer()

        humans = sum(1 for m in guild.members if not m.bot)
        bots = sum(1 for m in guild.members if m.bot)
        verified_row = await self.db.fetchone(
            "SELECT COUNT(*) c FROM members WHERE guild_id=? AND is_verified=1", (guild.id,)
        )
        open_tickets = await repo.count_open_tickets(self.db, guild.id)
        pending_apps = await self.db.fetchone(
            "SELECT COUNT(*) c FROM applications WHERE guild_id=? AND status='pending'", (guild.id,)
        )
        active_giveaways = await self.db.fetchone(
            "SELECT COUNT(*) c FROM giveaways WHERE guild_id=? AND status='active'", (guild.id,)
        )
        cases = await repo.count_cases(self.db, guild.id)
        uptime = format_uptime(time.time() - self.bot.start_time)

        embed = panel_embed(
            f"📊 Statistics — {guild.name}", "",
            fields=[
                ("Members", str(guild.member_count), True),
                ("Humans", str(humans), True),
                ("Bots", str(bots), True),
                ("Verified", str(verified_row["c"] if verified_row else 0), True),
                ("Channels", str(len(guild.channels)), True),
                ("Roles", str(len(guild.roles)), True),
                ("Open Tickets", str(open_tickets), True),
                ("Pending Applications", str(pending_apps["c"] if pending_apps else 0), True),
                ("Active Giveaways", str(active_giveaways["c"] if active_giveaways else 0), True),
                ("Moderation Cases", str(cases), True),
                ("Bot Uptime", uptime, True),
            ],
        )
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Statistics(bot))
