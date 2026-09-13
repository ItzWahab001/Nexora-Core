"""
Entry point. Loads config, connects the database, loads every cog, restores
persistent Views (so ticket/giveaway/verification buttons keep working after
a restart), syncs slash commands, and starts the bot.

Run with: python main.py
"""

from __future__ import annotations

import asyncio
import datetime as dt

import discord
from discord.ext import commands

from config import config
from database.database import Database
from utils.logger import logger

INTENTS = discord.Intents.default()
INTENTS.members = True
INTENTS.message_content = True
INTENTS.voice_states = True

COGS = [
    "cogs.menu",
    "cogs.tickets",
    "cogs.music",
    "cogs.giveaways",
    "cogs.ai",
    "cogs.moderation",
    "cogs.automod",
    "cogs.verification",
    "cogs.welcome",
    "cogs.goodbye",
    "cogs.autorole",
    "cogs.custom_commands",
    "cogs.logging_cog",
    "cogs.utility",
    "cogs.server",
    "cogs.admin",
]


class AllInOneBot(commands.Bot):
    def __init__(self) -> None:
        super().__init__(command_prefix="!", intents=INTENTS, help_command=None)
        self.db = Database(config.database_path)
        self.launch_time: dt.datetime | None = None

    async def setup_hook(self) -> None:
        await self.db.connect()
        logger.info("💾 Database: Connected")

        loaded, failed = 0, []
        for cog in COGS:
            try:
                await self.load_extension(cog)
                loaded += 1
            except Exception:
                failed.append(cog)
                logger.exception("Failed to load cog: %s", cog)
        logger.info("📦 Cogs: %s/%s loaded", loaded, len(COGS))
        if failed:
            logger.warning("The following cogs failed to load and were skipped: %s", ", ".join(failed))

        await self._register_persistent_views()

        if config.dev_guild_id:
            guild = discord.Object(id=config.dev_guild_id)
            self.tree.copy_global_to(guild=guild)
            synced = await self.tree.sync(guild=guild)
            logger.info("⚡ Commands: Synced %s commands to dev guild %s", len(synced), config.dev_guild_id)
        else:
            synced = await self.tree.sync()
            logger.info("⚡ Commands: Synced %s commands globally (may take up to 1h to propagate)", len(synced))

    async def _register_persistent_views(self) -> None:
        """
        Re-attaches persistent (timeout=None) views with fixed custom_ids so
        buttons on old messages keep working after a restart. Per-guild
        ticket-panel selects are rebuilt from the database; giveaway entry
        buttons are rebuilt for every still-active giveaway.
        """
        from cogs.tickets import TicketControlView
        from cogs.verification import VerifyView

        self.add_view(TicketControlView())
        self.add_view(VerifyView())

        try:
            panels = await self.db.fetchall("SELECT * FROM ticket_panels")
            for panel in panels:
                categories = [dict(r) for r in await self.db.get_panel_categories(panel["panel_id"])]
                if categories:
                    from cogs.tickets import TicketPanelView

                    self.add_view(TicketPanelView(panel["panel_id"], categories))

            active_giveaways = await self.db.active_giveaways()
            for giveaway in active_giveaways:
                from cogs.giveaways import GiveawayEntryView

                count = await self.db.giveaway_entry_count(giveaway["giveaway_id"])
                self.add_view(GiveawayEntryView(giveaway["giveaway_id"], count))
        except Exception:
            logger.exception("Failed to fully restore persistent views (bot will continue starting)")

        logger.info("🔐 Persistent views restored.")

    async def on_ready(self) -> None:
        self.launch_time = discord.utils.utcnow()
        logger.info("🤖 Bot: Online as %s (ID: %s)", self.user, self.user.id)
        logger.info("🔐 Security: Active")
        await self.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="/menu"))

    async def on_command_error(self, ctx: commands.Context, error: commands.CommandError) -> None:
        logger.error("Command error: %s", error)

    async def on_app_command_error(self, interaction: discord.Interaction, error) -> None:
        from discord import app_commands
        from utils.embeds import error_embed

        if isinstance(error, app_commands.MissingPermissions):
            message = "You don't have permission to use this command."
        elif isinstance(error, app_commands.CommandOnCooldown):
            message = f"This command is on cooldown. Try again in {error.retry_after:.1f}s."
        else:
            logger.exception("Unhandled app command error", exc_info=error)
            message = "Something went wrong running that command. The error has been logged."

        embed = error_embed("Error", message)
        try:
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)
        except discord.HTTPException:
            pass

    async def close(self) -> None:
        await self.db.close()
        await super().close()


async def main() -> None:
    bot = AllInOneBot()
    async with bot:
        await bot.start(config.discord_token)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down (KeyboardInterrupt).")
