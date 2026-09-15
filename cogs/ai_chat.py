import logging
import time

import discord
from discord import app_commands
from discord.ext import commands

from config import CONFIG
from database import repo
from utils.checks import require_admin
from utils.embeds import success_embed, error_embed

logger = logging.getLogger("cogs.ai")

COOLDOWN_SECONDS = 8
MAX_CONTEXT_MESSAGES = 10


class AIChat(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db
        self._last_use: dict[int, float] = {}
        self._history: dict[int, list[dict]] = {}
        self._client = None
        if CONFIG.ai_api_key:
            try:
                import anthropic
                self._client = anthropic.AsyncAnthropic(api_key=CONFIG.ai_api_key, base_url=CONFIG.ai_base_url)
            except ImportError:
                logger.warning("anthropic package not installed; AI chat disabled")

    @app_commands.command(name="ai-settings", description="Configure the AI chat channel")
    @require_admin()
    async def ai_settings(self, interaction: discord.Interaction, channel: discord.TextChannel, enabled: bool):
        await repo.update_guild_settings(self.db, interaction.guild_id, ai_channel_id=channel.id, ai_enabled=int(enabled))
        await interaction.response.send_message(
            embed=success_embed("AI settings saved", f"Channel: {channel.mention} — Enabled: {enabled}"),
            ephemeral=True,
        )

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return
        settings = await repo.get_guild_settings(self.db, message.guild.id)
        if not settings["ai_enabled"] or message.channel.id != settings["ai_channel_id"]:
            return
        if not self._client:
            return

        now = time.time()
        last = self._last_use.get(message.author.id, 0)
        if now - last < COOLDOWN_SECONDS:
            return
        self._last_use[message.author.id] = now

        history = self._history.setdefault(message.channel.id, [])
        history.append({"role": "user", "content": message.content})
        history[:] = history[-MAX_CONTEXT_MESSAGES:]

        async with message.channel.typing():
            try:
                response = await self._client.messages.create(
                    model=CONFIG.ai_model,
                    max_tokens=600,
                    messages=history,
                )
                reply = "".join(block.text for block in response.content if block.type == "text")
            except Exception as e:
                logger.exception("AI API call failed")
                await message.reply(embed=error_embed("AI error", "The AI service is temporarily unavailable. Try again shortly."))
                return

        history.append({"role": "assistant", "content": reply})
        for chunk_start in range(0, len(reply), 2000):
            await message.reply(reply[chunk_start:chunk_start + 2000])


async def setup(bot: commands.Bot):
    await bot.add_cog(AIChat(bot))
