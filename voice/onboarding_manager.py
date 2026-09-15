"""
Voice Onboarding Manager — the bot's primary feature.

Responsibilities:
  * Detect a member joining the configured "Greetings / Introduction" VC
  * Connect the bot to that VC (auto-connect / auto-reconnect / rejoin on restart)
  * Speak a personalized, configurable TTS introduction
  * Track per-member progress in the database so a leave/rejoin or a bot
    restart resumes instead of restarting from scratch
  * Serialize playback per guild (Discord only gives one outbound audio
    stream per guild voice connection) via an internal queue, while still
    tracking each member's session independently
  * Handle timeouts and clean up completed/abandoned sessions
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

import discord

from database.db import Database
from database import repo
from tts.base import TTSProvider, TTSError
from tts.cache import read_cached, write_cache

logger = logging.getLogger("voice.onboarding")


@dataclass
class QueuedGreeting:
    guild_id: int
    user_id: int
    channel_id: int
    session_id: int


@dataclass
class GuildVoiceState:
    voice_client: Optional[discord.VoiceClient] = None
    queue: "asyncio.Queue[QueuedGreeting]" = field(default_factory=asyncio.Queue)
    worker_task: Optional[asyncio.Task] = None
    currently_speaking_to: Optional[int] = None  # user_id
    connect_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class OnboardingManager:
    def __init__(self, bot: discord.Client, db: Database, tts_provider: TTSProvider,
                 tts_voice: str, tts_provider_name: str):
        self.bot = bot
        self.db = db
        self.tts_provider = tts_provider
        self.tts_voice = tts_voice
        self.tts_provider_name = tts_provider_name
        self._guild_states: dict[int, GuildVoiceState] = {}
        # user_ids currently enqueued/being-greeted, to prevent duplicate sessions
        self._active_users: set[tuple[int, int]] = set()

    # ─────────────────────────── lifecycle ───────────────────────────

    def _state(self, guild_id: int) -> GuildVoiceState:
        if guild_id not in self._guild_states:
            self._guild_states[guild_id] = GuildVoiceState()
        return self._guild_states[guild_id]

    async def resume_after_restart(self):
        """Called once on_ready fires — reconnects to onboarding VCs that
        still have unverified members waiting, and resumes DB sessions."""
        for guild in self.bot.guilds:
            settings = await repo.get_guild_settings(self.db, guild.id)
            if not settings["onboarding_enabled"] or not settings["onboarding_vc_id"]:
                continue
            channel = guild.get_channel(settings["onboarding_vc_id"])
            if not isinstance(channel, discord.VoiceChannel):
                continue

            # Re-enqueue anyone still sitting in the VC
            for member in channel.members:
                if member.bot:
                    continue
                if await repo.is_verified(self.db, guild.id, member.id):
                    continue
                await self.handle_member_joined_vc(member, channel)

            # Mark orphaned in-progress sessions whose member already left
            # as abandoned-but-resumable (stage is preserved for next join).
            in_progress = await repo.get_all_in_progress_sessions(self.db, guild.id)
            present_ids = {m.id for m in channel.members}
            for sess in in_progress:
                if sess["user_id"] not in present_ids:
                    logger.info(
                        f"Session {sess['session_id']} for user {sess['user_id']} "
                        f"in guild {guild.id} left before restart — will resume on rejoin."
                    )

    # ─────────────────────────── event entrypoints ───────────────────────────

    async def handle_member_joined_vc(self, member: discord.Member, channel: discord.VoiceChannel):
        guild_id = member.guild.id
        key = (guild_id, member.id)
        if key in self._active_users:
            logger.debug(f"Duplicate join ignored for {member} in guild {guild_id}")
            return
        if await repo.is_verified(self.db, guild_id, member.id):
            return

        settings = await repo.get_guild_settings(self.db, guild_id)
        if not settings["onboarding_enabled"] or settings["onboarding_vc_id"] != channel.id:
            return

        session_id = await repo.create_session(self.db, guild_id, member.id, channel.id)
        self._active_users.add(key)

        state = self._state(guild_id)
        await state.queue.put(QueuedGreeting(guild_id, member.id, channel.id, session_id))
        logger.info(f"Queued onboarding greeting for {member} (session {session_id})")

        if state.worker_task is None or state.worker_task.done():
            state.worker_task = asyncio.create_task(self._guild_worker(guild_id))

    async def handle_member_left_vc(self, member: discord.Member, channel: discord.VoiceChannel):
        guild_id = member.guild.id
        key = (guild_id, member.id)
        self._active_users.discard(key)
        state = self._guild_states.get(guild_id)
        if state and state.currently_speaking_to == member.id and state.voice_client:
            # Stop speaking immediately if the target left mid-sentence.
            if state.voice_client.is_playing():
                state.voice_client.stop()
        # Progress (stage) is left as-is in the DB so a rejoin resumes.

        # If VC is now empty of unverified members, disconnect to free the slot.
        remaining_unverified = [m for m in channel.members if not m.bot]
        if not remaining_unverified and state and state.voice_client and state.voice_client.is_connected():
            if state.queue.empty() and state.currently_speaking_to is None:
                await state.voice_client.disconnect(force=False)
                state.voice_client = None
                logger.info(f"Disconnected from onboarding VC in guild {guild_id} (channel empty)")

    # ─────────────────────────── worker ───────────────────────────

    async def _ensure_connected(self, guild_id: int, channel: discord.VoiceChannel) -> Optional[discord.VoiceClient]:
        state = self._state(guild_id)
        async with state.connect_lock:
            vc = state.voice_client
            if vc and vc.is_connected():
                if vc.channel.id != channel.id:
                    await vc.move_to(channel)
                return vc
            try:
                vc = await channel.connect(reconnect=True, timeout=20)
                state.voice_client = vc
                return vc
            except discord.ClientException as e:
                # Already connected somewhere in this guild per discord.py's bookkeeping
                existing = discord.utils.get(self.bot.voice_clients, guild=channel.guild)
                if existing:
                    await existing.move_to(channel)
                    state.voice_client = existing
                    return existing
                logger.error(f"Failed to connect to onboarding VC in guild {guild_id}: {e}")
                return None
            except Exception:
                logger.exception(f"Unexpected error connecting to onboarding VC in guild {guild_id}")
                return None

    async def _guild_worker(self, guild_id: int):
        state = self._state(guild_id)
        while True:
            try:
                item: QueuedGreeting = await asyncio.wait_for(state.queue.get(), timeout=120)
            except asyncio.TimeoutError:
                logger.info(f"Onboarding worker idle timeout for guild {guild_id}, shutting down worker")
                return

            guild = self.bot.get_guild(guild_id)
            if guild is None:
                continue
            channel = guild.get_channel(item.channel_id)
            member = guild.get_member(item.user_id)

            key = (guild_id, item.user_id)
            if member is None or not isinstance(channel, discord.VoiceChannel) or member not in channel.members:
                # Member left before we got to them — keep session, drop from active set.
                self._active_users.discard(key)
                continue

            settings = await repo.get_guild_settings(self.db, guild_id)
            vc = await self._ensure_connected(guild_id, channel)
            if vc is None:
                self._active_users.discard(key)
                continue

            state.currently_speaking_to = item.user_id
            try:
                await self._run_onboarding_script(member, channel, settings, item.session_id)
            except Exception:
                logger.exception(f"Onboarding script failed for {member} in guild {guild_id}")
            finally:
                state.currently_speaking_to = None
                self._active_users.discard(key)

            # If nobody else needs greeting and channel is now empty of humans, disconnect.
            if state.queue.empty():
                remaining = [m for m in channel.members if not m.bot]
                if not remaining and vc.is_connected():
                    await vc.disconnect(force=False)
                    state.voice_client = None

    # ─────────────────────────── script + TTS playback ───────────────────────────

    def build_script(self, member: discord.Member, settings: dict) -> str:
        guild = member.guild
        return (
            f"Welcome, {member.display_name}, to {guild.name}. "
            f"You are joining a community of {guild.member_count} members. "
            f"{settings['server_description']} "
            f"Before you get full access, please review our rules: {settings['server_rules']} "
            f"To finish verifying, please open the verification channel and click the Verify button. "
            f"Once verified, you'll get access to the rest of the server. Thanks for joining us!"
        )

    async def _speak(self, vc: discord.VoiceClient, text: str):
        cached = read_cached(self.tts_provider_name, self.tts_voice, text)
        if cached:
            audio_bytes = cached
        else:
            try:
                audio_bytes = await self.tts_provider.synthesize(text, self.tts_voice)
            except TTSError:
                logger.exception("TTS synthesis failed")
                return
            write_cache(self.tts_provider_name, self.tts_voice, text, audio_bytes)

        # Write to a temp file for FFmpeg (ffmpeg needs a real path or pipe).
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        done = asyncio.Event()
        loop = asyncio.get_running_loop()

        def _after(err):
            if err:
                logger.error(f"Playback error: {err}")
            loop.call_soon_threadsafe(done.set)

        try:
            source = discord.FFmpegPCMAudio(tmp_path)
            vc.play(source, after=_after)
            await asyncio.wait_for(done.wait(), timeout=90)
        except asyncio.TimeoutError:
            logger.warning("TTS playback timed out")
            if vc.is_playing():
                vc.stop()
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    async def _run_onboarding_script(self, member: discord.Member, channel: discord.VoiceChannel,
                                      settings: dict, session_id: int):
        await repo.update_session_stage(self.db, session_id, "speaking")
        script = self.build_script(member, settings)
        vc = self._state(member.guild.id).voice_client
        if vc is None:
            return
        await self._speak(vc, script)
        await repo.update_session_stage(self.db, session_id, "awaiting_verification")

        # Post/refresh the verification prompt in the text verification channel.
        verification_channel_id = settings.get("verification_channel_id")
        if verification_channel_id:
            vch = member.guild.get_channel(verification_channel_id)
            if isinstance(vch, discord.TextChannel):
                from views.verification_views import VerificationView
                try:
                    await vch.send(
                        f"{member.mention} Welcome! Click **Verify** below once you're ready to continue.",
                        view=VerificationView(self.db),
                    )
                except discord.Forbidden:
                    logger.warning(f"Missing permission to post in verification channel {vch.id}")

    async def test_voice(self, channel: discord.VoiceChannel, settings: dict) -> str:
        """Used by the admin panel's 'Test Voice' button — connects,
        speaks a short sample, then disconnects. Returns a status string."""
        try:
            vc = await channel.connect(reconnect=True, timeout=20)
        except Exception as e:
            return f"Failed to connect: {e}"
        try:
            sample = f"This is a test of the voice onboarding system for {channel.guild.name}."
            await self._speak(vc, sample)
            return "Test playback completed successfully."
        finally:
            if vc.is_connected():
                await vc.disconnect(force=False)
