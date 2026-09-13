"""User-defined text-response commands, e.g. /custom create command:rules response:..."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.checks import is_admin
from utils.embeds import base_embed, error_embed, success_embed
from views.common import PanelView


class CustomCommands(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    custom_group = app_commands.Group(name="custom", description="Manage custom text commands")

    @custom_group.command(name="create", description="Create or update a custom command")
    @is_admin()
    async def create(self, interaction: discord.Interaction, command: str, response: str) -> None:
        name = command.lower().lstrip("!/")
        if not name.isalnum() and "_" not in name:
            # allow letters/numbers/underscore only
            name = "".join(c for c in name if c.isalnum() or c == "_")
        if not name:
            await interaction.response.send_message(embed=error_embed("Invalid Name"), ephemeral=True)
            return
        await self.bot.db.add_custom_command(interaction.guild_id, name, response, interaction.user.id)
        await interaction.response.send_message(embed=success_embed("Custom Command Saved", f"`!{name}`"), ephemeral=True)

    @custom_group.command(name="delete", description="Delete a custom command")
    @is_admin()
    async def delete(self, interaction: discord.Interaction, command: str) -> None:
        await self.bot.db.delete_custom_command(interaction.guild_id, command)
        await interaction.response.send_message(embed=success_embed("Custom Command Deleted", f"`!{command}`"), ephemeral=True)

    @custom_group.command(name="edit", description="Edit an existing custom command's response")
    @is_admin()
    async def edit(self, interaction: discord.Interaction, command: str, response: str) -> None:
        existing = await self.bot.db.get_custom_command(interaction.guild_id, command)
        if not existing:
            await interaction.response.send_message(embed=error_embed("Not Found"), ephemeral=True)
            return
        await self.bot.db.add_custom_command(interaction.guild_id, command, response, interaction.user.id)
        await interaction.response.send_message(embed=success_embed("Custom Command Updated", f"`!{command}`"), ephemeral=True)

    @custom_group.command(name="list", description="List all custom commands")
    async def list_cmd(self, interaction: discord.Interaction) -> None:
        rows = await self.bot.db.list_custom_commands(interaction.guild_id)
        if not rows:
            await interaction.response.send_message(embed=error_embed("No Custom Commands"), ephemeral=True)
            return
        lines = [f"`!{r['name']}`" + ("" if r["enabled"] else " (disabled)") for r in rows]
        await interaction.response.send_message(embed=base_embed("⚙️ Custom Commands", ", ".join(lines)), ephemeral=True)

    @custom_group.command(name="enable", description="Enable a custom command")
    @is_admin()
    async def enable(self, interaction: discord.Interaction, command: str) -> None:
        await self.bot.db.set_custom_command_enabled(interaction.guild_id, command, True)
        await interaction.response.send_message(embed=success_embed("Command Enabled", f"`!{command}`"), ephemeral=True)

    @custom_group.command(name="disable", description="Disable a custom command")
    @is_admin()
    async def disable(self, interaction: discord.Interaction, command: str) -> None:
        await self.bot.db.set_custom_command_enabled(interaction.guild_id, command, False)
        await interaction.response.send_message(embed=success_embed("Command Disabled", f"`!{command}`"), ephemeral=True)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot or message.guild is None:
            return
        if not message.content.startswith("!"):
            return
        name = message.content[1:].split()[0].lower() if len(message.content) > 1 else ""
        if not name:
            return
        row = await self.bot.db.get_custom_command(message.guild.id, name)
        if row and row["enabled"]:
            await message.channel.send(row["response"])


async def build_custom_commands_panel(bot, guild_id: int, author_id: int):
    from views.main_menu import build_main_menu

    rows = await bot.db.list_custom_commands(guild_id)
    listing = ", ".join(f"`!{r['name']}`" for r in rows[:20]) if rows else "None yet"

    embed = base_embed("⚙️ Custom Commands", "Create simple text-response commands, triggered with `!name`.")
    embed.add_field(name="Configured Commands", value=listing, inline=False)
    embed.add_field(
        name="Commands",
        value="`/custom create` `/custom edit` `/custom delete` `/custom list` `/custom enable` `/custom disable`",
        inline=False,
    )
    view = PanelView(author_id=author_id, parent_builder=lambda: build_main_menu(author_id))
    view.add_nav_row(show_back=True)
    return embed, view


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CustomCommands(bot))
