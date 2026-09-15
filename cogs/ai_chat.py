import logging
import time
import aiohttp

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
        self._gemini_key = CONFIG.gemini_api_key
        self._gemini_model = CONFIG.gemini_model
        if CONFIG.ai_api_key and not self._gemini_key:
            try:
                import anthropic
                self._client = anthropic.AsyncAnthropic(api_key=CONFIG.ai_api_key, base_url=CONFIG.ai_base_url)
            except ImportError:
                logger.warning("anthropic package not installed; Anthropic AI disabled")

    async def _generate_gemini(self, history: list[dict]) -> str:
        contents = []
        for item in history:
            role = "model" if item["role"] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": item["content"]}]})
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self._gemini_model}:generateContent?key={self._gemini_key}"
        )
        payload = {"contents": contents, "generationConfig": {"maxOutputTokens": 600}}
        timeout = aiohttp.ClientTimeout(total=45)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=payload) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(data.get("error", {}).get("message", f"Gemini HTTP {resp.status}"))
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts if p.get("text"))
        if not text:
            raise RuntimeError("Gemini returned an empty response")
        return text[:8000]

    async def _generate(self, history: list[dict]) -> str:
        if self._gemini_key:
            return await self._generate_gemini(history)
        if self._client:
            response = await self._client.messages.create(
                model=CONFIG.ai_model, max_tokens=600, messages=history
            )
            return "".join(block.text for block in response.content if block.type == "text")
        raise RuntimeError("AI is not configured. Add GEMINI_API_KEY or AI_API_KEY in Railway Variables.")

    async def _answer(self, interaction: discord.Interaction, prompt: str):
        if not self._gemini_key and not self._client:
            await interaction.response.send_message(
                embed=error_embed("AI not configured", "Add GEMINI_API_KEY (recommended) or AI_API_KEY in Railway Variables."),
                ephemeral=True,
            )
            return
        history = self._history.setdefault(interaction.channel_id, [])
        history.append({"role": "user", "content": prompt})
        history[:] = history[-MAX_CONTEXT_MESSAGES:]
        await interaction.response.defer()
        try:
            reply = await self._generate(history)
        except Exception:
            logger.exception("AI API call failed")
            history.pop()
            await interaction.followup.send(
                embed=error_embed("AI error", "The AI service is temporarily unavailable. Check the API key/model and try again."),
                ephemeral=True,
            )
            return
        history.append({"role": "assistant", "content": reply})
        await interaction.followup.send(reply[:2000])

    @app_commands.command(name="ai", description="Ask the configured AI assistant")
    async def ai(self, interaction: discord.Interaction, prompt: str):
        await self._answer(interaction, prompt)

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
        if not self._client and not self._gemini_key:
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
                reply = await self._generate(history)
            except Exception:
                logger.exception("AI API call failed")
                history.pop()
                await message.reply(embed=error_embed("AI error", "The AI service is temporarily unavailable. Check the API key/model and try again."))
                return

        history.append({"role": "assistant", "content": reply})
        for chunk_start in range(0, len(reply), 2000):
            await message.reply(reply[chunk_start:chunk_start + 2000])


async def setup(bot: commands.Bot):
    await bot.add_cog(AIChat(bot))
