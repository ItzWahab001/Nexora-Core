"""The /menu command: entry point into the whole interactive control center."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from views.main_menu import build_main_menu


class MenuCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="menu", description="Open the bot control center")
    async def menu(self, interaction: discord.Interaction) -> None:
        embed, view = build_main_menu(interaction.user.id)
        await interaction.response.send_message(embed=embed, view=view)
        view.message = await interaction.original_response()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(MenuCog(bot))
