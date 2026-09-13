"""Server information command and embed builder (shared with /menu -> Server)."""

from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.embeds import base_embed
from utils.helpers import format_absolute


def build_server_info_embed(guild: discord.Guild) -> discord.Embed:
    bots = sum(1 for m in guild.members if m.bot)
    embed = base_embed(f"📊 {guild.name}")
    if guild.icon:
        embed.set_thumbnail(url=guild.icon.url)
    embed.add_field(name="Server ID", value=str(guild.id), inline=True)
    embed.add_field(name="Owner", value=f"<@{guild.owner_id}>", inline=True)
    embed.add_field(name="Created", value=format_absolute(guild.created_at), inline=True)
    embed.add_field(name="Members", value=str(guild.member_count), inline=True)
    embed.add_field(name="Bots", value=str(bots), inline=True)
    embed.add_field(name="Humans", value=str(guild.member_count - bots), inline=True)
    embed.add_field(name="Channels", value=str(len(guild.channels)), inline=True)
    embed.add_field(name="Roles", value=str(len(guild.roles)), inline=True)
    embed.add_field(name="Boost Level", value=str(guild.premium_tier), inline=True)
    embed.add_field(name="Boosts", value=str(guild.premium_subscription_count or 0), inline=True)
    embed.add_field(name="Verification Level", value=str(guild.verification_level).title(), inline=True)
    return embed


class Server(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="serverinfo", description="Show information about this server")
    async def serverinfo(self, interaction: discord.Interaction) -> None:
        await interaction.response.send_message(embed=build_server_info_embed(interaction.guild))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Server(bot))
