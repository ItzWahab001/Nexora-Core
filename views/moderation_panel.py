"""
Moderation Center panel. Actions that need a target + reason use modals;
quick actions (lock/unlock) act on the channel the panel was opened in.
"""

from __future__ import annotations

import discord

from services.moderation_service import moderation_service
from utils.embeds import base_embed, error_embed, success_embed
from utils.helpers import parse_duration
from utils.permissions import bot_can_moderate, can_moderate
from views.common import PanelView


def build_moderation_panel(author_id: int):
    from views.main_menu import build_main_menu

    embed = base_embed(
        "🛡️ Moderation Center",
        "Quick moderation actions. For bulk-delete/slowmode use `/clear` and `/slowmode` directly.",
    )
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_item(ActionButton("Ban", "🔨", discord.ButtonStyle.danger, "ban", row=0))
    view.add_item(ActionButton("Kick", "👢", discord.ButtonStyle.danger, "kick", row=0))
    view.add_item(ActionButton("Timeout", "⏱️", discord.ButtonStyle.primary, "timeout", row=0))
    view.add_item(ActionButton("Warn", "⚠️", discord.ButtonStyle.primary, "warn", row=0))
    view.add_item(LockButton())
    view.add_item(UnlockButton())
    view.add_nav_row(show_back=True)
    return embed, view


class ModTargetModal(discord.ui.Modal):
    target_id = discord.ui.TextInput(label="User ID", placeholder="123456789012345678")
    reason = discord.ui.TextInput(label="Reason", required=False, default="No reason provided", style=discord.TextStyle.paragraph)
    duration = discord.ui.TextInput(label="Duration (timeout only, e.g. 10m)", required=False)

    def __init__(self, action: str) -> None:
        super().__init__(title=f"{action.capitalize()} Member")
        self.action = action
        if action != "timeout":
            self.remove_item(self.duration)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        raw = self.target_id.value.strip().strip("<@!>")
        if not raw.isdigit():
            await interaction.response.send_message(embed=error_embed("Invalid User ID"), ephemeral=True)
            return
        member = interaction.guild.get_member(int(raw))
        if member is None:
            await interaction.response.send_message(embed=error_embed("Member Not Found"), ephemeral=True)
            return

        reason = self.reason.value or "No reason provided"

        if self.action in ("ban", "kick", "timeout"):
            allowed, why = can_moderate(interaction.user, member)
            if not allowed:
                await interaction.response.send_message(embed=error_embed("Permission Denied", why), ephemeral=True)
                return
            allowed, why = bot_can_moderate(interaction.guild, member)
            if not allowed:
                await interaction.response.send_message(embed=error_embed("I Can't Do That", why), ephemeral=True)
                return

        if self.action == "ban":
            await moderation_service.ban(interaction.guild, member, reason)
            await interaction.response.send_message(embed=success_embed("Member Banned", f"{member.mention} — {reason}"))
        elif self.action == "kick":
            await moderation_service.kick(interaction.guild, member, reason)
            await interaction.response.send_message(embed=success_embed("Member Kicked", f"{member.mention} — {reason}"))
        elif self.action == "timeout":
            seconds = parse_duration(self.duration.value or "10m")
            if not seconds:
                await interaction.response.send_message(embed=error_embed("Invalid Duration"), ephemeral=True)
                return
            await moderation_service.timeout(member, seconds, reason)
            await interaction.response.send_message(embed=success_embed("Member Timed Out", f"{member.mention} — {reason}"))
        elif self.action == "warn":
            warning_id = await interaction.client.db.add_warning(interaction.guild_id, member.id, interaction.user.id, reason)
            await interaction.response.send_message(embed=success_embed("Member Warned", f"{member.mention} — {reason} (#{warning_id})"))

        logging_cog = interaction.client.get_cog("LoggingCog")
        if logging_cog:
            await logging_cog.log_event(interaction.guild, self.action, f"{member} — {self.action} by {interaction.user}: {reason}")


class ActionButton(discord.ui.Button):
    def __init__(self, label: str, emoji: str, style: discord.ButtonStyle, action: str, row: int) -> None:
        super().__init__(label=label, emoji=emoji, style=style, row=row)
        self.action = action

    async def callback(self, interaction: discord.Interaction) -> None:
        await interaction.response.send_modal(ModTargetModal(self.action))


class LockButton(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Lock Channel", emoji="🔒", style=discord.ButtonStyle.secondary, row=1)

    async def callback(self, interaction: discord.Interaction) -> None:
        overwrite = interaction.channel.overwrites_for(interaction.guild.default_role)
        overwrite.send_messages = False
        await interaction.channel.set_permissions(interaction.guild.default_role, overwrite=overwrite)
        await interaction.response.send_message(embed=success_embed("Channel Locked"), ephemeral=True)


class UnlockButton(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Unlock Channel", emoji="🔓", style=discord.ButtonStyle.secondary, row=1)

    async def callback(self, interaction: discord.Interaction) -> None:
        overwrite = interaction.channel.overwrites_for(interaction.guild.default_role)
        overwrite.send_messages = None
        await interaction.channel.set_permissions(interaction.guild.default_role, overwrite=overwrite)
        await interaction.response.send_message(embed=success_embed("Channel Unlocked"), ephemeral=True)
