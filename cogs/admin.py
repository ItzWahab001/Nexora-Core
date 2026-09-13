"""Bot-owner/admin utility commands: reload cogs, sync commands, shutdown."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from config import config
from utils.embeds import error_embed, success_embed


def is_owner_check():
    async def predicate(interaction: discord.Interaction) -> bool:
        if interaction.user.id in config.owner_ids or await interaction.client.is_owner(interaction.user):
            return True
        raise app_commands.MissingPermissions(["owner"])

    return app_commands.check(predicate)


class Admin(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    admin_group = app_commands.Group(name="admin", description="Bot-owner maintenance commands")

    @admin_group.command(name="reload", description="Reload a cog (bot owner only)")
    @is_owner_check()
    async def reload(self, interaction: discord.Interaction, cog: str) -> None:
        try:
            await self.bot.reload_extension(f"cogs.{cog}")
        except Exception as exc:  # noqa: BLE001
            await interaction.response.send_message(embed=error_embed("Reload Failed", str(exc)), ephemeral=True)
            return
        await interaction.response.send_message(embed=success_embed("Cog Reloaded", cog), ephemeral=True)

    @admin_group.command(name="sync", description="Re-sync slash commands (bot owner only)")
    @is_owner_check()
    async def sync(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)
        if config.dev_guild_id:
            guild = discord.Object(id=config.dev_guild_id)
            synced = await self.bot.tree.sync(guild=guild)
        else:
            synced = await self.bot.tree.sync()
        await interaction.followup.send(embed=success_embed("Commands Synced", f"{len(synced)} commands."), ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Admin(bot))
