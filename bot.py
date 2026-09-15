"""
Entry point. Run with: python bot.py
"""
import asyncio
import logging
import time

import discord
from discord.ext import commands

from config import CONFIG, setup_logging
from database.db import Database
from database import repo
from tts.providers import get_provider
from voice.onboarding_manager import OnboardingManager
from views.verification_views import VerificationView
from views.ticket_views import TicketPanelView, TicketControlView
from views.giveaway_views import GiveawayView
from views.application_views import ApplicationPanelView, ApplicationReviewView

setup_logging()
logger = logging.getLogger("bot")

INTENTS = discord.Intents.default()
INTENTS.members = True
INTENTS.message_content = True
INTENTS.voice_states = True

COGS = [
    "cogs.onboarding",
    "cogs.verification",
    "cogs.tickets",
    "cogs.applications",
    "cogs.giveaways",
    "cogs.moderation",
    "cogs.ai_chat",
    "cogs.music",
    "cogs.welcome",
    "cogs.custom_commands",
    "cogs.statistics",
    "cogs.settings",
]


class DiscordBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix=CONFIG.default_prefix, intents=INTENTS, help_command=None)
        self.db = Database(CONFIG.database_path)
        self.start_time = time.time()
        self.onboarding_manager: OnboardingManager | None = None

    async def setup_hook(self):
        await self.db.connect()

        tts_provider = get_provider(CONFIG.tts_provider, CONFIG.tts_api_key)
        self.onboarding_manager = OnboardingManager(
            self, self.db, tts_provider, CONFIG.tts_voice, CONFIG.tts_provider
        )

        for cog in COGS:
            try:
                await self.load_extension(cog)
                logger.info(f"Loaded {cog}")
            except Exception:
                logger.exception(f"Failed to load {cog}")

        # Register static persistent views (safe even with no active messages yet).
        self.add_view(VerificationView(self.db))
        self.add_view(TicketPanelView(self.db))
        self.add_view(TicketControlView(self.db))

        await self._register_dynamic_persistent_views()

    async def _register_dynamic_persistent_views(self):
        """Re-register per-ID persistent views (giveaways, pending applications,
        application panels) so their buttons/selects keep working post-restart."""
        active_giveaways = await repo.get_active_giveaways(self.db)
        for g in active_giveaways:
            self.add_view(GiveawayView(self.db, g["giveaway_id"]))

        pending_apps = await self.db.fetchall("SELECT application_id FROM applications WHERE status='pending'")
        for a in pending_apps:
            self.add_view(ApplicationReviewView(self.db, a["application_id"]))

        for guild in self.guilds:
            types = await repo.get_application_types(self.db, guild.id)
            self.add_view(ApplicationPanelView(self.db, [dict(t) for t in types], guild.id))

    async def on_ready(self):
        logger.info(f"Logged in as {self.user} ({self.user.id}) — {len(self.guilds)} guild(s)")
        await self.onboarding_manager.resume_after_restart()
        activity = discord.Activity(type=discord.ActivityType.watching, name="new members verify")
        await self.change_presence(activity=activity)

    async def on_command_error(self, ctx: commands.Context, error: commands.CommandError):
        if isinstance(error, (commands.CommandNotFound, commands.CheckFailure)):
            return
        logger.exception("Unhandled prefix command error", exc_info=error)

    async def on_app_command_error_default(self, interaction: discord.Interaction, error: Exception):
        logger.exception("Unhandled app command error", exc_info=error)
        if interaction.response.is_done():
            await interaction.followup.send("Something went wrong running that command.", ephemeral=True)
        else:
            await interaction.response.send_message("Something went wrong running that command.", ephemeral=True)

    async def close(self):
        await self.db.close()
        await super().close()


async def main():
    if not CONFIG.discord_token:
        raise SystemExit("DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.")
    bot = DiscordBot()

    @bot.tree.error
    async def on_tree_error(interaction: discord.Interaction, error: discord.app_commands.AppCommandError):
        await bot.on_app_command_error_default(interaction, error)

    async with bot:
        await bot.start(CONFIG.discord_token)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down.")
