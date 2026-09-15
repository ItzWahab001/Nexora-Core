import random
import time

import discord
from discord import app_commands
from discord.ext import commands, tasks

from database import repo
from utils.checks import require_admin
from utils.embeds import success_embed, error_embed, panel_embed
from views.giveaway_views import GiveawayView


def parse_duration(text: str) -> int:
    """Parses '10m', '2h', '1d' style durations into seconds."""
    units = {"s": 1, "m": 60, "h": 3600, "d": 86400}
    text = text.strip().lower()
    if text[-1] in units and text[:-1].isdigit():
        return int(text[:-1]) * units[text[-1]]
    if text.isdigit():
        return int(text)
    raise ValueError("Duration must look like 30s, 10m, 2h, or 1d")


class Giveaways(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db
        self.check_giveaways.start()

    def cog_unload(self):
        self.check_giveaways.cancel()

    @tasks.loop(seconds=15)
    async def check_giveaways(self):
        active = await repo.get_active_giveaways(self.db)
        now = time.time()
        for g in active:
            if g["ends_at"] and g["ends_at"] <= now:
                await self._finish_giveaway(g["giveaway_id"])

    @check_giveaways.before_loop
    async def before_check(self):
        await self.bot.wait_until_ready()

    async def _finish_giveaway(self, giveaway_id: int, reroll: bool = False):
        g = await self.db.fetchone("SELECT * FROM giveaways WHERE giveaway_id=?", (giveaway_id,))
        if not g:
            return
        guild = self.bot.get_guild(g["guild_id"])
        channel = guild.get_channel(g["channel_id"]) if guild else None
        entries = await repo.get_entries(self.db, giveaway_id)

        if not entries:
            if channel:
                await channel.send(embed=error_embed("Giveaway ended", f"**{g['prize']}** had no valid entries."))
        else:
            winners = random.sample(entries, k=min(g["winner_count"], len(entries)))
            mentions = ", ".join(f"<@{w}>" for w in winners)
            if channel:
                await channel.send(embed=success_embed(
                    "🎉 Giveaway ended!" if not reroll else "🔁 Giveaway rerolled!",
                    f"**{g['prize']}**\nWinner(s): {mentions}",
                ))
        if not reroll:
            await repo.end_giveaway(self.db, giveaway_id, "ended")

    @app_commands.command(name="giveaway-create", description="Start a new giveaway")
    @app_commands.describe(prize="What's being given away", duration="e.g. 10m, 2h, 1d",
                            winners="Number of winners", requirement_role="Role required to enter (optional)")
    @require_admin()
    async def create(self, interaction: discord.Interaction, prize: str, duration: str,
                      winners: app_commands.Range[int, 1, 20] = 1,
                      requirement_role: discord.Role | None = None):
        try:
            seconds = parse_duration(duration)
        except ValueError as e:
            await interaction.response.send_message(embed=error_embed("Invalid duration", str(e)), ephemeral=True)
            return

        ends_at = time.time() + seconds
        giveaway_id = await repo.create_giveaway(
            self.db, interaction.guild_id, interaction.channel_id, prize, winners,
            interaction.user.id, ends_at, requirement_role.id if requirement_role else None,
        )
        embed = panel_embed(
            "🎉 GIVEAWAY 🎉", f"**Prize:** {prize}",
            fields=[
                ("Winners", str(winners), True),
                ("Hosted by", interaction.user.mention, True),
                ("Ends", f"<t:{int(ends_at)}:R>", True),
            ] + ([("Requirement", requirement_role.mention, True)] if requirement_role else []),
        )
        view = GiveawayView(self.db, giveaway_id)
        await interaction.response.send_message(embed=embed, view=view)
        msg = await interaction.original_response()
        await repo.set_giveaway_message(self.db, giveaway_id, msg.id)

    @app_commands.command(name="giveaway-reroll", description="Reroll winners for an ended giveaway")
    @require_admin()
    async def reroll(self, interaction: discord.Interaction, giveaway_id: int):
        await self._finish_giveaway(giveaway_id, reroll=True)
        await interaction.response.send_message("Rerolled.", ephemeral=True)

    @app_commands.command(name="giveaway-cancel", description="Cancel an active giveaway with no winners")
    @require_admin()
    async def cancel(self, interaction: discord.Interaction, giveaway_id: int):
        await repo.end_giveaway(self.db, giveaway_id, "cancelled")
        await interaction.response.send_message(embed=success_embed("Giveaway cancelled"), ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Giveaways(bot))
