"""
AI chat: /ai, /ask, /chat commands plus /ai setup/enable/disable/channel/reset
subcommands for per-guild configuration. Conversation history is stored in
the database per (guild, user) and trimmed to the most recent messages.
Uses services/ai_service.py so the provider itself is swappable.
"""

from __future__ import annotations

import asyncio

import discord
from discord import app_commands
from discord.ext import commands

from services.ai_service import AIServiceError, ai_service
from utils.checks import is_admin
from utils.embeds import base_embed, error_embed, success_embed
from utils.logger import logger

# very small per-user cooldown to avoid hammering the AI provider
_cooldown = commands.CooldownMapping.from_cooldown(4, 60, commands.BucketType.user)


class AI(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    ai_group = app_commands.Group(name="aiconfig", description="AI chat configuration")

    async def _rate_limited(self, interaction: discord.Interaction) -> bool:
        bucket = _cooldown.get_bucket(interaction)
        retry_after = bucket.update_rate_limit()
        if retry_after:
            await interaction.response.send_message(
                embed=error_embed("Slow Down", f"Try again in {retry_after:.1f}s."), ephemeral=True
            )
            return True
        return False

    async def _chat(self, interaction: discord.Interaction, message: str) -> None:
        # A Discord interaction must be acknowledged within ~3 seconds.
        # Defer BEFORE database/API work so a slow DB/provider can never produce
        # the dreaded "The application did not respond" message.
        if interaction.guild_id is None:
            await interaction.response.send_message(
                embed=error_embed("Server Only", "AI chat can only be used inside a Discord server."),
                ephemeral=True,
            )
            return

        message = message.strip()
        if not message:
            await interaction.response.send_message(
                embed=error_embed("Empty Message", "Please enter a message for the AI."),
                ephemeral=True,
            )
            return

        if await self._rate_limited(interaction):
            return

        await interaction.response.defer(thinking=True)

        try:
            settings = await asyncio.wait_for(
                self.bot.db.get_ai_settings(interaction.guild_id), timeout=5
            )
        except asyncio.TimeoutError:
            await interaction.followup.send(
                embed=error_embed("Database Timeout", "The bot database took too long to respond. Please try again.")
            )
            return

        if settings and not settings["enabled"]:
            await interaction.followup.send(
                embed=error_embed("AI Disabled", "An admin has disabled AI chat in this server. Try `/aiconfig enable`.")
            )
            return

        system_prompt = settings["system_prompt"] if settings else "You are a helpful, concise assistant inside a Discord server."
        try:
            history_rows = await asyncio.wait_for(
                self.bot.db.get_ai_history(interaction.guild_id, interaction.user.id), timeout=5
            )
        except asyncio.TimeoutError:
            await interaction.followup.send(
                embed=error_embed("Database Timeout", "The bot database took too long to respond. Please try again.")
            )
            return
        history = [{"role": r["role"], "content": r["content"]} for r in history_rows]

        try:
            reply = await asyncio.wait_for(
                ai_service.get_response(system_prompt, history, message),
                timeout=50,
            )
        except asyncio.TimeoutError:
            await interaction.followup.send(
                embed=error_embed(
                    "AI Timeout",
                    "The AI provider took too long to respond. Check the API settings/provider status and try again.",
                )
            )
            return
        except AIServiceError as exc:
            await interaction.followup.send(embed=error_embed("AI Error", str(exc)))
            return

        await self.bot.db.add_ai_message(interaction.guild_id, interaction.user.id, "user", message)
        await self.bot.db.add_ai_message(interaction.guild_id, interaction.user.id, "assistant", reply)

        embed = base_embed("🤖 AI Response", reply[:4000])
        embed.set_footer(text=f"Asked by {interaction.user}")
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="ai", description="Ask the AI something")
    async def ai_command(self, interaction: discord.Interaction, message: str) -> None:
        await self._chat(interaction, message)

    @app_commands.command(name="ask", description="Ask the AI a one-off question")
    async def ask(self, interaction: discord.Interaction, message: str) -> None:
        await self._chat(interaction, message)

    @app_commands.command(name="chat", description="Continue your AI conversation")
    async def chat(self, interaction: discord.Interaction, message: str) -> None:
        await self._chat(interaction, message)

    @ai_group.command(name="setup", description="Set the AI system prompt for this server")
    @is_admin()
    async def setup_prompt(self, interaction: discord.Interaction, system_prompt: str) -> None:
        await self.bot.db.upsert_ai_settings(interaction.guild_id, system_prompt=system_prompt)
        await interaction.response.send_message(embed=success_embed("AI Prompt Updated"), ephemeral=True)

    @ai_group.command(name="enable", description="Enable AI chat in this server")
    @is_admin()
    async def enable(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_ai_settings(interaction.guild_id, enabled=1)
        await interaction.response.send_message(embed=success_embed("AI Chat Enabled"), ephemeral=True)

    @ai_group.command(name="disable", description="Disable AI chat in this server")
    @is_admin()
    async def disable(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_ai_settings(interaction.guild_id, enabled=0)
        await interaction.response.send_message(embed=success_embed("AI Chat Disabled"), ephemeral=True)

    @ai_group.command(name="channel", description="Set a dedicated AI chat channel (auto-replies to every message there)")
    @is_admin()
    async def channel(self, interaction: discord.Interaction, channel: discord.TextChannel) -> None:
        await self.bot.db.upsert_ai_settings(interaction.guild_id, channel_id=channel.id, enabled=1)
        await interaction.response.send_message(embed=success_embed("AI Channel Set", channel.mention), ephemeral=True)

    @ai_group.command(name="reset", description="Reset your AI conversation history")
    async def reset(self, interaction: discord.Interaction) -> None:
        await self.bot.db.reset_ai_history(interaction.guild_id, interaction.user.id)
        await interaction.response.send_message(embed=success_embed("Conversation Reset"), ephemeral=True)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot or message.guild is None:
            return
        try:
            settings = await asyncio.wait_for(self.bot.db.get_ai_settings(message.guild.id), timeout=5)
        except asyncio.TimeoutError:
            return
        if not settings or not settings["enabled"] or not settings["channel_id"]:
            return
        if message.channel.id != settings["channel_id"] or not message.content.strip():
            return

        async with message.channel.typing():
            try:
                history_rows = await asyncio.wait_for(
                    self.bot.db.get_ai_history(message.guild.id, message.author.id), timeout=5
                )
            except asyncio.TimeoutError:
                await message.reply(embed=error_embed("Database Timeout", "The bot database took too long to respond."))
                return
            history = [{"role": r["role"], "content": r["content"]} for r in history_rows]
            try:
                reply = await asyncio.wait_for(
                    ai_service.get_response(settings["system_prompt"], history, message.content),
                    timeout=50,
                )
            except asyncio.TimeoutError:
                await message.reply(
                    embed=error_embed(
                        "AI Timeout",
                        "The AI provider took too long to respond.",
                    )
                )
                return
            except AIServiceError as exc:
                await message.reply(embed=error_embed("AI Error", str(exc)))
                return
            await self.bot.db.add_ai_message(message.guild.id, message.author.id, "user", message.content)
            await self.bot.db.add_ai_message(message.guild.id, message.author.id, "assistant", reply)
            await message.reply(reply[:2000])


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AI(bot))
