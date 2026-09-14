import asyncio
import logging
import os

import discord
from discord.ext import commands
from dotenv import load_dotenv

from database.database import Database
from utils.logger import setup_logging

load_dotenv()
setup_logging()
log = logging.getLogger("bot")

TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN is missing. Copy .env.example to .env and configure it.")

intents = discord.Intents.default()
intents.members = True
intents.message_content = True
intents.voice_states = True
intents.guilds = True

class CommunityBot(commands.Bot):
    def __init__(self):
        super().__init__(
            command_prefix=os.getenv("PREFIX", "!"),
            intents=intents,
            help_command=None,
            allowed_mentions=discord.AllowedMentions(everyone=False, roles=False, users=True),
        )
        self.db = Database(os.getenv("DATABASE_PATH", "data/bot.sqlite3"))
        self.start_time = discord.utils.utcnow()
        self.synced = False

    async def setup_hook(self):
        await self.db.connect()
        cog_names = [
            "cogs.onboarding", "cogs.verification", "cogs.tickets",
            "cogs.applications", "cogs.giveaways", "cogs.moderation",
            "cogs.music", "cogs.ai", "cogs.welcome",
            "cogs.custom_commands", "cogs.statistics"
        ]
        for name in cog_names:
            try:
                await self.load_extension(name)
                log.info("Loaded %s", name)
            except Exception:
                log.exception("Failed to load %s", name)
        await self._register_persistent_views()

    async def _register_persistent_views(self):
        from views.verification import VerificationView
        from views.tickets import TicketPanelView
        from views.giveaways import GiveawayView
        from views.applications import ApplicationPanelView
        self.add_view(VerificationView(self))
        self.add_view(TicketPanelView(self))
        self.add_view(GiveawayView(self))
        self.add_view(ApplicationPanelView(self))

    async def on_ready(self):
        if not self.synced:
            try:
                await self.tree.sync()
                self.synced = True
                log.info("Slash commands synced.")
            except Exception:
                log.exception("Slash command sync failed.")
        log.info("Logged in as %s (%s)", self.user, self.user.id)
        onboarding = self.get_cog("Onboarding")
        if onboarding:
            await onboarding.restore_voice_connections()

    async def close(self):
        await self.db.close()
        await super().close()

bot = CommunityBot()
bot.run(TOKEN)
