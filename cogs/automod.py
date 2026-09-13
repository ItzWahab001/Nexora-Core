"""
AutoMod: spam/flood protection, invite & link filtering, word filter, and
mention-spam protection, all configurable per guild and stored in
automod_settings. Message-rate tracking for spam/flood detection is kept
in memory (per-process) since it only needs to survive seconds, not a
restart.
"""

from __future__ import annotations

import re
import time
from collections import defaultdict, deque

import discord
from discord import app_commands
from discord.ext import commands

from services.moderation_service import moderation_service
from utils.checks import is_admin
from utils.embeds import base_embed, error_embed, success_embed
from views.common import PanelView

INVITE_RE = re.compile(r"(discord\.gg|discordapp\.com/invite|discord\.com/invite)/\S+", re.IGNORECASE)
LINK_RE = re.compile(r"https?://\S+", re.IGNORECASE)


class AutoMod(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        # guild_id -> user_id -> deque[timestamps]
        self._message_times: dict[int, dict[int, deque]] = defaultdict(lambda: defaultdict(lambda: deque(maxlen=20)))

    automod_group = app_commands.Group(name="automod", description="Configure AutoMod")

    @automod_group.command(name="setup", description="Initialize AutoMod with default settings")
    @is_admin()
    async def setup_cmd(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_automod_settings(interaction.guild_id, enabled=1)
        await interaction.response.send_message(embed=success_embed("AutoMod Initialized", "Default protections are now active."), ephemeral=True)

    @automod_group.command(name="enable", description="Enable AutoMod")
    @is_admin()
    async def enable(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_automod_settings(interaction.guild_id, enabled=1)
        await interaction.response.send_message(embed=success_embed("AutoMod Enabled"), ephemeral=True)

    @automod_group.command(name="disable", description="Disable AutoMod")
    @is_admin()
    async def disable(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_automod_settings(interaction.guild_id, enabled=0)
        await interaction.response.send_message(embed=success_embed("AutoMod Disabled"), ephemeral=True)

    @automod_group.command(name="config", description="Configure AutoMod protections")
    @is_admin()
    @app_commands.describe(
        anti_spam="Toggle spam protection", anti_invite="Toggle invite filtering",
        anti_link="Toggle link filtering", word_filter="Toggle bad-word filtering",
        mention_spam="Toggle mention spam protection", banned_words="Comma-separated banned words",
        punishment="warn, timeout, kick, or ban",
    )
    async def config(
        self,
        interaction: discord.Interaction,
        anti_spam: bool | None = None,
        anti_invite: bool | None = None,
        anti_link: bool | None = None,
        word_filter: bool | None = None,
        mention_spam: bool | None = None,
        banned_words: str | None = None,
        punishment: str | None = None,
    ) -> None:
        fields = {}
        for name, val in (
            ("anti_spam", anti_spam), ("anti_invite", anti_invite), ("anti_link", anti_link),
            ("word_filter", word_filter), ("mention_spam", mention_spam),
        ):
            if val is not None:
                fields[name] = int(val)
        if banned_words is not None:
            fields["banned_words"] = banned_words
        if punishment is not None:
            if punishment not in ("warn", "timeout", "kick", "ban"):
                await interaction.response.send_message(embed=error_embed("Invalid Punishment", "Use warn, timeout, kick, or ban."), ephemeral=True)
                return
            fields["punishment"] = punishment
        await self.bot.db.upsert_automod_settings(interaction.guild_id, **fields)
        await interaction.response.send_message(embed=success_embed("AutoMod Settings Updated"), ephemeral=True)

    async def _punish(self, message: discord.Message, settings, reason: str) -> None:
        member = message.author
        punishment = settings["punishment"]
        try:
            if punishment == "timeout":
                await moderation_service.timeout(member, 600, reason)
            elif punishment == "kick":
                await moderation_service.kick(message.guild, member, reason)
            elif punishment == "ban":
                await moderation_service.ban(message.guild, member, reason)
        except discord.Forbidden:
            pass
        await self.bot.db.add_warning(message.guild.id, member.id, self.bot.user.id, reason, source="automod")

        logging_cog = self.bot.get_cog("LoggingCog")
        if logging_cog:
            await logging_cog.log_event(message.guild, "automod", f"🚨 AutoMod actioned {member} ({punishment}) — {reason}")

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot or message.guild is None or not isinstance(message.author, discord.Member):
            return
        if message.author.guild_permissions.manage_messages:
            return  # never automod staff

        settings = await self.bot.db.get_automod_settings(message.guild.id)
        if not settings or not settings["enabled"]:
            return

        if settings["anti_invite"] and INVITE_RE.search(message.content):
            await message.delete()
            await self._punish(message, settings, "Posted a Discord invite link")
            return

        if settings["anti_link"] and LINK_RE.search(message.content):
            await message.delete()
            await self._punish(message, settings, "Posted a link")
            return

        if settings["word_filter"] and settings["banned_words"]:
            words = [w.strip().lower() for w in settings["banned_words"].split(",") if w.strip()]
            content_lower = message.content.lower()
            if any(w in content_lower for w in words):
                await message.delete()
                await self._punish(message, settings, "Used a filtered word")
                return

        if settings["mention_spam"] and len(message.mentions) >= settings["mention_limit"]:
            await message.delete()
            await self._punish(message, settings, f"Mention spam ({len(message.mentions)} mentions)")
            return

        if settings["anti_spam"]:
            now = time.monotonic()
            times = self._message_times[message.guild.id][message.author.id]
            times.append(now)
            recent = [t for t in times if now - t <= settings["spam_interval_seconds"]]
            if len(recent) >= settings["spam_message_limit"]:
                await self._punish(message, settings, "Sending messages too quickly (spam)")
                times.clear()


async def build_automod_panel(bot, guild_id: int, author_id: int):
    from views.main_menu import build_main_menu

    settings = await bot.db.get_automod_settings(guild_id)
    if not settings:
        status_lines = "AutoMod hasn't been initialized. Run `/automod setup`."
    else:
        def flag(key, label):
            return f"{'✅' if settings[key] else '❌'} {label}"

        status_lines = (
            f"AutoMod: {'✅ Enabled' if settings['enabled'] else '❌ Disabled'}\n"
            f"{flag('anti_spam', 'Anti-Spam')}\n{flag('anti_invite', 'Invite Filter')}\n"
            f"{flag('anti_link', 'Link Filter')}\n{flag('word_filter', 'Word Filter')}\n"
            f"{flag('mention_spam', 'Mention Protection')}\n"
            f"Punishment: **{settings['punishment']}**"
        )

    embed = base_embed("🚨 AutoMod Center", status_lines)
    embed.add_field(name="Commands", value="`/automod setup` `/automod config` `/automod enable` `/automod disable`", inline=False)
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_nav_row(show_back=False)
    return embed, view


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AutoMod(bot))
