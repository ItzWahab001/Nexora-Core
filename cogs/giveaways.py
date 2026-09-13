"""
Giveaway system. Entry buttons are persistent (custom_id encodes the
giveaway_id) so they keep working after a restart. A background task
checks every 15s for giveaways whose end_time has passed and ends them
automatically, which is also how restart-survival is verified: on_ready
re-registers a GiveawayEntryView for every still-active giveaway.
"""

from __future__ import annotations

import datetime as dt
import random

import discord
from discord import app_commands
from discord.ext import commands, tasks

from utils.checks import is_admin
from utils.embeds import base_embed, error_embed, success_embed
from utils.helpers import format_absolute, format_relative
from utils.logger import logger


def _build_giveaway_embed(row, entry_count: int) -> discord.Embed:
    end_time = dt.datetime.fromisoformat(row["end_time"])
    embed = base_embed("🎉 GIVEAWAY 🎉")
    embed.add_field(name="🎁 Prize", value=row["prize"], inline=False)
    embed.add_field(name="🏆 Winners", value=str(row["winners_count"]), inline=True)
    embed.add_field(name="👥 Entries", value=str(entry_count), inline=True)
    embed.add_field(name="👤 Hosted by", value=f"<@{row['host_id']}>", inline=True)
    embed.add_field(name="⏰ Ends", value=format_relative(end_time), inline=True)
    if row["requirement"]:
        embed.add_field(name="Requirements", value=row["requirement"], inline=False)
    embed.set_footer(text="Click the button below to enter!")
    return embed


class GiveawayEntryView(discord.ui.View):
    def __init__(self, giveaway_id: int, entry_count: int = 0) -> None:
        super().__init__(timeout=None)
        self.giveaway_id = giveaway_id
        self.add_item(EnterButton(giveaway_id, entry_count))


class EnterButton(discord.ui.Button):
    def __init__(self, giveaway_id: int, entry_count: int) -> None:
        super().__init__(
            label=f"Enter Giveaway ({entry_count})",
            emoji="🎟️",
            style=discord.ButtonStyle.success,
            custom_id=f"giveaway_enter:{giveaway_id}",
        )
        self.giveaway_id = giveaway_id

    async def callback(self, interaction: discord.Interaction) -> None:
        bot = interaction.client
        giveaway = await bot.db.get_giveaway(self.giveaway_id)
        if not giveaway or giveaway["ended"]:
            await interaction.response.send_message(embed=error_embed("Giveaway Ended"), ephemeral=True)
            return
        added = await bot.db.add_giveaway_entry(self.giveaway_id, interaction.user.id)
        count = await bot.db.giveaway_entry_count(self.giveaway_id)
        self.label = f"Enter Giveaway ({count})"
        await interaction.message.edit(view=self.view)
        if added:
            await interaction.response.send_message(embed=success_embed("Entered!", "Good luck! 🍀"), ephemeral=True)
        else:
            await interaction.response.send_message(embed=error_embed("Already Entered", "You're already in this giveaway."), ephemeral=True)


class Giveaways(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.check_giveaways.start()

    def cog_unload(self) -> None:
        self.check_giveaways.cancel()

    giveaway_group = app_commands.Group(name="giveaway", description="Manage giveaways")

    @giveaway_group.command(name="start", description="Start a new giveaway")
    @is_admin()
    @app_commands.describe(prize="What is being given away", duration="e.g. 10m, 1h, 1d", winners="Number of winners", requirement="Optional entry requirement text")
    async def start(
        self,
        interaction: discord.Interaction,
        prize: str,
        duration: str,
        winners: app_commands.Range[int, 1, 20] = 1,
        requirement: str | None = None,
    ) -> None:
        from utils.helpers import parse_duration

        seconds = parse_duration(duration)
        if not seconds:
            await interaction.response.send_message(
                embed=error_embed("Invalid Duration", "Use something like `10m`, `1h`, or `1d`."), ephemeral=True
            )
            return

        end_time = discord.utils.utcnow() + dt.timedelta(seconds=seconds)
        giveaway_id = await self.bot.db.create_giveaway(
            interaction.guild_id, interaction.channel_id, prize, winners, interaction.user.id, requirement, end_time
        )
        row = await self.bot.db.get_giveaway(giveaway_id)
        embed = _build_giveaway_embed(row, 0)
        view = GiveawayEntryView(giveaway_id, 0)
        await interaction.response.send_message(embed=embed, view=view)
        message = await interaction.original_response()
        await self.bot.db.set_giveaway_message(giveaway_id, message.id)

    @giveaway_group.command(name="end", description="End a giveaway immediately")
    @is_admin()
    async def end(self, interaction: discord.Interaction, giveaway_id: int) -> None:
        row = await self.bot.db.get_giveaway(giveaway_id)
        if not row or row["guild_id"] != interaction.guild_id or row["ended"]:
            await interaction.response.send_message(embed=error_embed("Not Found or Already Ended"), ephemeral=True)
            return
        await self._finish_giveaway(row)
        await interaction.response.send_message(embed=success_embed("Giveaway Ended"), ephemeral=True)

    @giveaway_group.command(name="reroll", description="Reroll winners for an ended giveaway")
    @is_admin()
    async def reroll(self, interaction: discord.Interaction, giveaway_id: int) -> None:
        row = await self.bot.db.get_giveaway(giveaway_id)
        if not row or not row["ended"]:
            await interaction.response.send_message(embed=error_embed("Giveaway Not Ended Yet"), ephemeral=True)
            return
        entrants = await self.bot.db.giveaway_entrants(giveaway_id)
        if not entrants:
            await interaction.response.send_message(embed=error_embed("No Entrants"), ephemeral=True)
            return
        winners = random.sample(entrants, k=min(row["winners_count"], len(entrants)))
        mentions = ", ".join(f"<@{w}>" for w in winners)
        channel = interaction.guild.get_channel(row["channel_id"])
        if channel:
            await channel.send(embed=success_embed("🏆 Giveaway Rerolled", f"New winner(s): {mentions}\nPrize: **{row['prize']}**"))
        await interaction.response.send_message(embed=success_embed("Rerolled"), ephemeral=True)

    @giveaway_group.command(name="cancel", description="Cancel a giveaway without picking winners")
    @is_admin()
    async def cancel(self, interaction: discord.Interaction, giveaway_id: int) -> None:
        row = await self.bot.db.get_giveaway(giveaway_id)
        if not row or row["guild_id"] != interaction.guild_id:
            await interaction.response.send_message(embed=error_embed("Not Found"), ephemeral=True)
            return
        await self.bot.db.mark_giveaway_cancelled(giveaway_id)
        channel = interaction.guild.get_channel(row["channel_id"])
        if channel and row["message_id"]:
            try:
                message = await channel.fetch_message(row["message_id"])
                await message.edit(embed=error_embed("Giveaway Cancelled", f"**{row['prize']}**"), view=None)
            except discord.HTTPException:
                pass
        await interaction.response.send_message(embed=success_embed("Giveaway Cancelled"), ephemeral=True)

    @giveaway_group.command(name="list", description="List active giveaways in this server")
    async def list_giveaways(self, interaction: discord.Interaction) -> None:
        rows = await self.bot.db.active_giveaways(interaction.guild_id)
        if not rows:
            await interaction.response.send_message(embed=error_embed("No Active Giveaways"), ephemeral=True)
            return
        lines = [f"#{r['giveaway_id']} — **{r['prize']}** ({format_relative(dt.datetime.fromisoformat(r['end_time']))})" for r in rows]
        await interaction.response.send_message("\n".join(lines), ephemeral=True)

    async def _finish_giveaway(self, row) -> None:
        await self.bot.db.mark_giveaway_ended(row["giveaway_id"])
        entrants = await self.bot.db.giveaway_entrants(row["giveaway_id"])
        channel = self.bot.get_channel(row["channel_id"])
        if channel is None:
            return
        if not entrants:
            await channel.send(embed=error_embed("Giveaway Ended", f"No one entered **{row['prize']}**."))
            return
        winners = random.sample(entrants, k=min(row["winners_count"], len(entrants)))
        mentions = ", ".join(f"<@{w}>" for w in winners)
        embed = success_embed("🏆 WINNER(S)", f"Congratulations {mentions}!\nYou won: **{row['prize']}**")
        await channel.send(embed=embed)

        if row["message_id"]:
            try:
                message = await channel.fetch_message(row["message_id"])
                ended_embed = _build_giveaway_embed(row, len(entrants))
                ended_embed.title = "🎉 GIVEAWAY ENDED 🎉"
                await message.edit(embed=ended_embed, view=None)
            except discord.HTTPException:
                pass

        logging_cog = self.bot.get_cog("LoggingCog")
        if logging_cog:
            await logging_cog.log_event(channel.guild, "giveaway", f"🎉 Giveaway **{row['prize']}** ended. Winners: {mentions}")

    @tasks.loop(seconds=15)
    async def check_giveaways(self) -> None:
        rows = await self.bot.db.active_giveaways()
        now = discord.utils.utcnow()
        for row in rows:
            end_time = dt.datetime.fromisoformat(row["end_time"])
            if end_time <= now:
                try:
                    await self._finish_giveaway(row)
                except Exception:
                    logger.exception("Failed to auto-end giveaway %s", row["giveaway_id"])

    @check_giveaways.before_loop
    async def before_check_giveaways(self) -> None:
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Giveaways(bot))
