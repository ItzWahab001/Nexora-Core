import asyncio
import logging
import os
from pathlib import Path

import discord
from discord.ext import commands, tasks

from voice.manager import VoiceManager
from voice.tts import EdgeTTSProvider, cache_path
from utils.embeds import embed

log = logging.getLogger("onboarding")

class Onboarding(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.voice = VoiceManager(bot)
        self.tts = EdgeTTSProvider()
        self.sessions = {}
        self.timeouts = {}
        self.reconnect_loop.start()

    def cog_unload(self):
        self.reconnect_loop.cancel()

    async def restore_voice_connections(self):
        for guild in self.bot.guilds:
            s = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (guild.id,))
            if s and s["onboarding_enabled"] and s["onboarding_vc_id"]:
                ch = guild.get_channel(s["onboarding_vc_id"])
                if isinstance(ch, discord.VoiceChannel):
                    try:
                        await self.voice.connect(guild, ch)
                    except Exception:
                        log.exception("Could not restore onboarding VC for %s", guild.id)

    @tasks.loop(seconds=30)
    async def reconnect_loop(self):
        await self.bot.wait_until_ready()
        await self.restore_voice_connections()

    @commands.Cog.listener()
    async def on_member_join(self, member):
        s = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (member.guild.id,))
        if not s or not s["onboarding_enabled"]:
            return
        new_role = member.guild.get_role(s["new_member_role_id"]) if s["new_member_role_id"] else None
        if new_role:
            try: await member.add_roles(new_role, reason="New member onboarding")
            except discord.Forbidden: log.warning("Cannot assign new-member role.")
        await self.bot.db.execute(
            "INSERT INTO members(guild_id,user_id,joined_at) VALUES(?,?,CURRENT_TIMESTAMP) "
            "ON CONFLICT(guild_id,user_id) DO NOTHING", (member.guild.id, member.id))

    @commands.Cog.listener()
    async def on_voice_state_update(self, member, before, after):
        if member.bot:
            return
        s = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (member.guild.id,))
        if not s or not s["onboarding_enabled"] or not s["onboarding_vc_id"]:
            return
        if after.channel and after.channel.id == s["onboarding_vc_id"]:
            if member.id not in self.sessions:
                await self.start_session(member, s)

    async def start_session(self, member, s):
        existing = await self.bot.db.fetchone(
            "SELECT * FROM onboarding_sessions WHERE guild_id=? AND user_id=? AND active=1",
            (member.guild.id, member.id))
        if existing and s["onboarding_resume"]:
            state = existing["state"]
        else:
            state = "welcome"
            await self.bot.db.execute(
                "INSERT INTO onboarding_sessions(guild_id,user_id,state,started_at,active) VALUES(?,?,?,CURRENT_TIMESTAMP,1) "
                "ON CONFLICT(guild_id,user_id) DO UPDATE SET state='welcome',active=1,updated_at=CURRENT_TIMESTAMP",
                (member.guild.id, member.id))
        self.sessions[member.id] = state
        timeout = int(s["onboarding_timeout"] or 300)
        self.timeouts[member.id] = asyncio.create_task(self._timeout(member, timeout))
        try:
            await self._speak(member, s, self._welcome_text(member, s))
            rules = s["rules_text"] or "Please read the server rules and complete verification in the verification channel."
            await self._speak(member, s, rules)
            await self._speak(member, s, "Your next step is verification. Please use the verification channel to continue.")
            await self.bot.db.execute(
                "UPDATE onboarding_sessions SET state='verification',active=1,updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND user_id=?",
                (member.guild.id, member.id))
        except Exception:
            log.exception("Onboarding session failed for %s", member.id)
        finally:
            task = self.timeouts.pop(member.id, None)
            if task: task.cancel()

    def _welcome_text(self, member, s):
        custom = s["welcome_message"]
        if custom:
            return custom.format(username=member.display_name, server_name=member.guild.name, member_number=member.guild.member_count)
        return (
            f"Hello and welcome, {member.display_name}! Welcome to {member.guild.name}. "
            f"You are member number {member.guild.member_count} of our community. "
            "I will guide you through the onboarding process. "
            "Please listen to the rules, then complete verification to unlock the community."
        )

    async def _speak(self, member, s, text):
        if not member.voice or not member.voice.channel:
            return
        vc = await self.voice.connect(member.guild, member.voice.channel)
        path = cache_path(text, s["tts_voice"] or os.getenv("TTS_VOICE", "en-US-AriaNeural"))
        if not path.exists():
            await self.tts.synthesize(text, s["tts_voice"] or "en-US-AriaNeural", path)
        while vc.is_playing():
            await asyncio.sleep(.2)
        vc.play(discord.FFmpegPCMAudio(str(path)))
        while vc.is_playing():
            await asyncio.sleep(.2)

    async def _timeout(self, member, seconds):
        await asyncio.sleep(seconds)
        if member.id in self.sessions:
            self.sessions.pop(member.id, None)
            await self.bot.db.execute(
                "UPDATE onboarding_sessions SET active=0,updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND user_id=?",
                (member.guild.id, member.id))

    @commands.hybrid_group(name="onboarding", fallback="status")
    @commands.has_guild_permissions(manage_guild=True)
    async def onboarding(self, ctx):
        s = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (ctx.guild.id,))
        await ctx.send(embed=embed("Onboarding Status", f"Configured: {'Yes' if s else 'No'}"))

    @onboarding.command(name="setup")
    async def setup_cmd(self, ctx, vc: discord.VoiceChannel, verification: discord.TextChannel, new_member_role: discord.Role, verified_role: discord.Role):
        await self.bot.db.execute(
            "INSERT INTO guild_settings(guild_id,onboarding_vc_id,verification_channel_id,new_member_role_id,verified_role_id) "
            "VALUES(?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET onboarding_vc_id=excluded.onboarding_vc_id,"
            "verification_channel_id=excluded.verification_channel_id,new_member_role_id=excluded.new_member_role_id,"
            "verified_role_id=excluded.verified_role_id",
            (ctx.guild.id, vc.id, verification.id, new_member_role.id, verified_role.id))
        await self.voice.connect(ctx.guild, vc)
        await ctx.send(embed=embed("✅ Onboarding configured", "Voice onboarding and role configuration saved."))

    @onboarding.command(name="enable")
    async def enable(self, ctx):
        await self.bot.db.execute("INSERT INTO guild_settings(guild_id,onboarding_enabled) VALUES(?,1) "
                                  "ON CONFLICT(guild_id) DO UPDATE SET onboarding_enabled=1", (ctx.guild.id,))
        await ctx.send("Onboarding enabled.")

    @onboarding.command(name="disable")
    async def disable(self, ctx):
        await self.bot.db.execute("INSERT INTO guild_settings(guild_id,onboarding_enabled) VALUES(?,0) "
                                  "ON CONFLICT(guild_id) DO UPDATE SET onboarding_enabled=0", (ctx.guild.id,))
        await ctx.send("Onboarding disabled.")

    @onboarding.command(name="channel")
    async def channel(self, ctx, vc: discord.VoiceChannel):
        await self.bot.db.execute("INSERT INTO guild_settings(guild_id,onboarding_vc_id) VALUES(?,?) "
                                  "ON CONFLICT(guild_id) DO UPDATE SET onboarding_vc_id=excluded.onboarding_vc_id",
                                  (ctx.guild.id, vc.id))
        await self.voice.connect(ctx.guild, vc)
        await ctx.send(f"Onboarding VC set to {vc.mention}.")

    @onboarding.command(name="role")
    async def role(self, ctx, new_member_role: discord.Role, verified_role: discord.Role):
        await self.bot.db.execute("INSERT INTO guild_settings(guild_id,new_member_role_id,verified_role_id) VALUES(?,?,?) "
                                  "ON CONFLICT(guild_id) DO UPDATE SET new_member_role_id=excluded.new_member_role_id,"
                                  "verified_role_id=excluded.verified_role_id",
                                  (ctx.guild.id, new_member_role.id, verified_role.id))
        await ctx.send("Onboarding roles saved.")

    @onboarding.command(name="message")
    async def message(self, ctx, *, text: str):
        await self.bot.db.execute("INSERT INTO guild_settings(guild_id,welcome_message) VALUES(?,?) "
                                  "ON CONFLICT(guild_id) DO UPDATE SET welcome_message=excluded.welcome_message",
                                  (ctx.guild.id, text))
        await ctx.send("Welcome message saved.")

    @onboarding.command(name="rules")
    async def rules(self, ctx, *, text: str):
        await self.bot.db.execute("INSERT INTO guild_settings(guild_id,rules_text) VALUES(?,?) "
                                  "ON CONFLICT(guild_id) DO UPDATE SET rules_text=excluded.rules_text",
                                  (ctx.guild.id, text))
        await ctx.send("Rules text saved.")

    @onboarding.command(name="reset")
    async def reset(self, ctx, member: discord.Member):
        self.sessions.pop(member.id, None)
        await self.bot.db.execute("UPDATE onboarding_sessions SET active=0 WHERE guild_id=? AND user_id=?",
                                  (ctx.guild.id, member.id))
        await ctx.send(f"Onboarding reset for {member.mention}.")

    @onboarding.command(name="test")
    async def test(self, ctx):
        s = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (ctx.guild.id,))
        if not s or not s["onboarding_vc_id"]:
            return await ctx.send("Configure the onboarding VC first.")
        await ctx.send("Onboarding configuration is reachable. Join the configured VC to test the full voice flow.")

async def setup(bot):
    await bot.add_cog(Onboarding(bot))
