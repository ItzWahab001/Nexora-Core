"""
🎙️ Voice Onboarding admin control panel.
Every control here writes straight to guild_settings and takes effect
immediately — no restart, no source-code edits required.
"""
import discord

from database import repo
from database.db import Database
from utils.embeds import panel_embed, success_embed
from utils.checks import is_staff


def status_embed(settings: dict, guild: discord.Guild) -> discord.Embed:
    onboarding_vc = guild.get_channel(settings["onboarding_vc_id"]) if settings["onboarding_vc_id"] else None
    verif_ch = guild.get_channel(settings["verification_channel_id"]) if settings["verification_channel_id"] else None
    unverified_role = guild.get_role(settings["unverified_role_id"]) if settings["unverified_role_id"] else None
    verified_role = guild.get_role(settings["verified_role_id"]) if settings["verified_role_id"] else None

    return panel_embed(
        "🎙️ Voice Onboarding — Control Panel",
        "Configure the automatic voice-based onboarding & verification flow.",
        fields=[
            ("Status", "🟢 Enabled" if settings["onboarding_enabled"] else "🔴 Disabled", True),
            ("Onboarding VC", onboarding_vc.mention if onboarding_vc else "Not set", True),
            ("Verification Channel", verif_ch.mention if verif_ch else "Not set", True),
            ("Unverified Role", unverified_role.mention if unverified_role else "Not set", True),
            ("Verified Role", verified_role.mention if verified_role else "Not set", True),
            ("Timeout", f"{settings['onboarding_timeout_seconds']}s", True),
            ("TTS Provider / Voice", f"{settings['tts_provider'] or 'default'} / {settings['tts_voice'] or 'default'}", True),
            ("Server Description", settings["server_description"], False),
            ("Rules", settings["server_rules"], False),
        ],
    )


class ContentModal(discord.ui.Modal, title="Configure Onboarding Content"):
    description = discord.ui.TextInput(
        label="Server description (spoken)", style=discord.TextStyle.paragraph,
        max_length=300, required=False,
    )
    rules = discord.ui.TextInput(
        label="Rules summary (spoken)", style=discord.TextStyle.paragraph,
        max_length=500, required=False,
    )

    def __init__(self, db: Database, current: dict):
        super().__init__()
        self.db = db
        self.description.default = current["server_description"]
        self.rules.default = current["server_rules"]

    async def on_submit(self, interaction: discord.Interaction):
        await repo.update_guild_settings(
            self.db, interaction.guild_id,
            server_description=str(self.description.value) or "A great place to hang out.",
            server_rules=str(self.rules.value) or "Be respectful. No spam.",
        )
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await interaction.response.edit_message(embed=status_embed(settings, interaction.guild),
                                                  view=OnboardingAdminView(self.db))


class TimeoutTTSModal(discord.ui.Modal, title="Configure Timing & Voice"):
    timeout_seconds = discord.ui.TextInput(label="Session timeout (seconds)", max_length=6, required=True)
    tts_voice = discord.ui.TextInput(label="TTS voice id (e.g. en-US-GuyNeural)", max_length=100, required=False)

    def __init__(self, db: Database, current: dict):
        super().__init__()
        self.db = db
        self.timeout_seconds.default = str(current["onboarding_timeout_seconds"])
        self.tts_voice.default = current["tts_voice"] or ""

    async def on_submit(self, interaction: discord.Interaction):
        try:
            timeout_val = max(30, min(3600, int(str(self.timeout_seconds.value))))
        except ValueError:
            timeout_val = 300
        await repo.update_guild_settings(
            self.db, interaction.guild_id,
            onboarding_timeout_seconds=timeout_val,
            tts_voice=str(self.tts_voice.value) or None,
        )
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await interaction.response.edit_message(embed=status_embed(settings, interaction.guild),
                                                  view=OnboardingAdminView(self.db))


class OnboardingAdminView(discord.ui.View):
    def __init__(self, db: Database):
        super().__init__(timeout=300)
        self.db = db

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if not isinstance(interaction.user, discord.Member) or not is_staff(interaction.user):
            await interaction.response.send_message("You need Manage Server permission.", ephemeral=True)
            return False
        return True

    async def _refresh(self, interaction: discord.Interaction):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await interaction.response.edit_message(embed=status_embed(settings, interaction.guild), view=self)

    @discord.ui.select(cls=discord.ui.ChannelSelect, channel_types=[discord.ChannelType.voice],
                        placeholder="Set the Greetings / Introduction VC", row=0)
    async def set_vc(self, interaction: discord.Interaction, select: discord.ui.ChannelSelect):
        await repo.update_guild_settings(self.db, interaction.guild_id, onboarding_vc_id=select.values[0].id)
        await self._refresh(interaction)

    @discord.ui.select(cls=discord.ui.ChannelSelect, channel_types=[discord.ChannelType.text],
                        placeholder="Set the Verification text channel", row=1)
    async def set_verif_channel(self, interaction: discord.Interaction, select: discord.ui.ChannelSelect):
        await repo.update_guild_settings(self.db, interaction.guild_id, verification_channel_id=select.values[0].id)
        await self._refresh(interaction)

    @discord.ui.select(cls=discord.ui.RoleSelect, placeholder="Set the Unverified role", row=2)
    async def set_unverified_role(self, interaction: discord.Interaction, select: discord.ui.RoleSelect):
        await repo.update_guild_settings(self.db, interaction.guild_id, unverified_role_id=select.values[0].id)
        await self._refresh(interaction)

    @discord.ui.select(cls=discord.ui.RoleSelect, placeholder="Set the Verified role", row=3)
    async def set_verified_role(self, interaction: discord.Interaction, select: discord.ui.RoleSelect):
        await repo.update_guild_settings(self.db, interaction.guild_id, verified_role_id=select.values[0].id)
        await self._refresh(interaction)

    @discord.ui.button(label="Enable/Disable", style=discord.ButtonStyle.primary, row=4, emoji="🔁")
    async def toggle(self, interaction: discord.Interaction, button: discord.ui.Button):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        new_state = not bool(settings["onboarding_enabled"])
        if new_state and not (settings["onboarding_vc_id"] and settings["verified_role_id"]):
            await interaction.response.send_message(
                "Set the Onboarding VC and Verified role before enabling.", ephemeral=True
            )
            return
        await repo.update_guild_settings(self.db, interaction.guild_id, onboarding_enabled=int(new_state))
        await self._refresh(interaction)

    @discord.ui.button(label="Configure Content", style=discord.ButtonStyle.secondary, row=4, emoji="📝")
    async def configure_content(self, interaction: discord.Interaction, button: discord.ui.Button):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await interaction.response.send_modal(ContentModal(self.db, settings))

    @discord.ui.button(label="Timing & Voice", style=discord.ButtonStyle.secondary, row=4, emoji="⏱️")
    async def configure_timing(self, interaction: discord.Interaction, button: discord.ui.Button):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await interaction.response.send_modal(TimeoutTTSModal(self.db, settings))

    @discord.ui.button(label="Test Voice", style=discord.ButtonStyle.success, row=4, emoji="🔊")
    async def test_voice(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not isinstance(interaction.user, discord.Member) or interaction.user.voice is None:
            await interaction.response.send_message("Join a voice channel first, then press Test Voice.", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        manager = interaction.client.onboarding_manager  # type: ignore[attr-defined]
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        result = await manager.test_voice(interaction.user.voice.channel, settings)
        await interaction.followup.send(result, ephemeral=True)

    @discord.ui.button(label="Reset Configuration", style=discord.ButtonStyle.danger, row=4, emoji="♻️")
    async def reset(self, interaction: discord.Interaction, button: discord.ui.Button):
        await repo.update_guild_settings(
            self.db, interaction.guild_id,
            onboarding_enabled=0, onboarding_vc_id=None, verification_channel_id=None,
            unverified_role_id=None, verified_role_id=None,
            server_description="A great place to hang out.",
            server_rules="Be respectful. No spam. Follow Discord ToS.",
            onboarding_timeout_seconds=300, tts_voice=None,
        )
        await self._refresh(interaction)
