"""
AutoMod: two layers, working together.

1. Discord's **native AutoMod** (guild.create_automod_rule) — real server-side
   rules Discord itself enforces (instant, works even if the bot is offline,
   and is what makes Discord show the "Uses AutoMod" badge on the bot's
   profile). `/automod setup` provisions a default spam-link/mention rule set
   here.
2. Our own **custom layer** below (word filter with our banned-word list,
   message-rate spam tracking, punishment escalation via warnings DB) — this
   still runs in Python because it needs things native AutoMod can't do:
   guild-specific banned word lists editable at runtime, our own warning
   history, and our punishment/logging pipeline.

Both are controlled by the same `/automod` commands and `automod_settings`
row, so from the admin's point of view it's one system.
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
from utils.logger import logger
from views.common import PanelView

INVITE_RE = re.compile(r"(discord\.gg|discordapp\.com/invite|discord\.com/invite)/\S+", re.IGNORECASE)
LINK_RE = re.compile(r"https?://\S+", re.IGNORECASE)

NATIVE_RULE_NAME = "Nexora Core — Spam & Mention Protection"


class AutoMod(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        # guild_id -> user_id -> deque[timestamps]
        self._message_times: dict[int, dict[int, deque]] = defaultdict(lambda: defaultdict(lambda: deque(maxlen=20)))

    automod_group = app_commands.Group(name="automod", description="Configure AutoMod")

    # ----------------------------------------------------- native AutoMod
    async def _create_native_rule(self, guild: discord.Guild) -> str | None:
        """
        Creates (or leaves alone if it already exists) a Discord-native
        AutoMod rule using discord.py's AutoModRule API. Requires the bot to
        have the `manage_guild` permission. Returns an error string on
        failure, or None on success/already-exists.
        """
        try:
            existing = await guild.fetch_automod_rules()
        except discord.Forbidden:
            return "I'm missing the **Manage Server** permission needed to create native AutoMod rules."
        except discord.HTTPException as exc:
            return f"Discord rejected the request: {exc}"

        if any(r.name == NATIVE_RULE_NAME for r in existing):
            return None  # already provisioned

        trigger = discord.AutoModTrigger(
            type=discord.AutoModRuleTriggerType.mention_spam,
            mention_limit=5,
        )
        action = discord.AutoModRuleAction(type=discord.AutoModRuleActionType.block_message)

        try:
            await guild.create_automod_rule(
                name=NATIVE_RULE_NAME,
                event_type=discord.AutoModRuleEventType.message_send,
                trigger=trigger,
                actions=[action],
                enabled=True,
                reason="Provisioned by /automod setup",
            )
        except discord.Forbidden:
            return "I'm missing the **Manage Server** permission needed to create native AutoMod rules."
        except discord.HTTPException as exc:
            logger.warning("Failed to create native AutoMod rule in guild %s: %s", guild.id, exc)
            return f"Discord rejected the rule: {exc}"
        return None

    @automod_group.command(name="setup", description="Initialize AutoMod with default settings")
    @is_admin()
    async def setup_cmd(self, interaction: discord.Interaction) -> None:
        await self.bot.db.upsert_automod_settings(interaction.guild_id, enabled=1)
        await interaction.response.defer(ephemeral=True, thinking=True)

        native_error = await self._create_native_rule(interaction.guild)

        if native_error:
            await interaction.followup.send(
                embed=success_embed(
                    "AutoMod Initialized",
                    "Our custom protections (word filter, spam tracking, invite/link filter) are active.\n\n"
                    f"⚠️ Couldn't also set up Discord's native mention-spam rule: {native_error}",
                ),
                ephemeral=True,
            )
        else:
            await interaction.followup.send(
                embed=success_embed(
                    "AutoMod Initialized",
                    "Custom protections are active, and a native Discord AutoMod rule "
                    "(mention-spam blocking) has been created for this server.",
                ),
                ephemeral=True,
            )

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

    @commands.Cog.listener()
    async def on_ready(self) -> None:
        # Backfill the native AutoMod rule into any guild that already had
        # our AutoMod enabled before this feature existed, without requiring
        # an admin to re-run /automod setup.
        for guild in self.bot.guilds:
            settings = await self.bot.db.get_automod_settings(guild.id)
            if settings and settings["enabled"]:
                await self._create_native_rule(guild)

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
    embed.add_field(
        name="Native Discord AutoMod",
        value="Provisioned via `/automod setup` (requires Manage Server permission).",
        inline=False,
    )
    embed.add_field(name="Commands", value="`/automod setup` `/automod config` `/automod enable` `/automod disable`", inline=False)
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_nav_row(show_back=True)
    return embed, view


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AutoMod(bot))
