"""General utility commands: ping, help, avatar, userinfo, roleinfo, channelinfo, botinfo, uptime, invite."""

from __future__ import annotations

import time

import discord
from discord import app_commands
from discord.ext import commands

from utils.embeds import base_embed
from utils.helpers import format_absolute

START_TIME = time.monotonic()


class Utility(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="ping", description="Check the bot's latency")
    async def ping(self, interaction: discord.Interaction) -> None:
        await interaction.response.send_message(embed=base_embed("🏓 Pong!", f"Latency: {round(self.bot.latency * 1000)}ms"))

    @app_commands.command(name="help", description="Show help and open the main control panel")
    async def help_cmd(self, interaction: discord.Interaction) -> None:
        embed = base_embed(
            "🤖 Bot Help",
            "Use `/menu` to open the interactive control center, or explore feature-specific "
            "command groups: `/ticket`, `/giveaway`, `/ai`, `/automod`, `/verify`, `/welcome`, "
            "`/goodbye`, `/autorole`, `/custom`, `/logs`, and moderation commands like `/ban`, `/kick`, `/warn`.",
        )
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="avatar", description="Show a user's avatar")
    async def avatar(self, interaction: discord.Interaction, member: discord.Member | None = None) -> None:
        member = member or interaction.user
        embed = base_embed(f"{member.name}'s Avatar")
        embed.set_image(url=member.display_avatar.url)
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="userinfo", description="Show information about a user")
    async def userinfo(self, interaction: discord.Interaction, member: discord.Member | None = None) -> None:
        member = member or interaction.user
        embed = base_embed(f"👤 {member}")
        embed.set_thumbnail(url=member.display_avatar.url)
        embed.add_field(name="ID", value=str(member.id), inline=True)
        embed.add_field(name="Display Name", value=member.display_name, inline=True)
        embed.add_field(name="Bot", value="Yes" if member.bot else "No", inline=True)
        embed.add_field(name="Account Created", value=format_absolute(member.created_at), inline=True)
        if member.joined_at:
            embed.add_field(name="Joined Server", value=format_absolute(member.joined_at), inline=True)
        roles = [r.mention for r in member.roles if not r.is_default()]
        embed.add_field(name=f"Roles ({len(roles)})", value=", ".join(roles[:20]) or "None", inline=False)
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="roleinfo", description="Show information about a role")
    async def roleinfo(self, interaction: discord.Interaction, role: discord.Role) -> None:
        embed = base_embed(f"🎭 {role.name}")
        embed.add_field(name="ID", value=str(role.id), inline=True)
        embed.add_field(name="Color", value=str(role.color), inline=True)
        embed.add_field(name="Members", value=str(len(role.members)), inline=True)
        embed.add_field(name="Position", value=str(role.position), inline=True)
        embed.add_field(name="Mentionable", value="Yes" if role.mentionable else "No", inline=True)
        embed.add_field(name="Created", value=format_absolute(role.created_at), inline=True)
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="channelinfo", description="Show information about a channel")
    async def channelinfo(self, interaction: discord.Interaction, channel: discord.abc.GuildChannel | None = None) -> None:
        channel = channel or interaction.channel
        embed = base_embed(f"📁 #{channel.name}")
        embed.add_field(name="ID", value=str(channel.id), inline=True)
        embed.add_field(name="Type", value=str(channel.type), inline=True)
        embed.add_field(name="Created", value=format_absolute(channel.created_at), inline=True)
        if isinstance(channel, discord.TextChannel):
            embed.add_field(name="Slowmode", value=f"{channel.slowmode_delay}s", inline=True)
            embed.add_field(name="NSFW", value="Yes" if channel.nsfw else "No", inline=True)
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="botinfo", description="Show information about this bot")
    async def botinfo(self, interaction: discord.Interaction) -> None:
        embed = base_embed(f"🤖 {self.bot.user.name}")
        embed.set_thumbnail(url=self.bot.user.display_avatar.url)
        embed.add_field(name="Servers", value=str(len(self.bot.guilds)), inline=True)
        embed.add_field(name="Latency", value=f"{round(self.bot.latency * 1000)}ms", inline=True)
        embed.add_field(name="Library", value=f"discord.py {discord.__version__}", inline=True)
        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="uptime", description="Show how long the bot has been running")
    async def uptime(self, interaction: discord.Interaction) -> None:
        elapsed = int(time.monotonic() - START_TIME)
        h, rem = divmod(elapsed, 3600)
        m, s = divmod(rem, 60)
        await interaction.response.send_message(embed=base_embed("⏱️ Uptime", f"{h}h {m}m {s}s"))

    @app_commands.command(name="invite", description="Get an invite link to add this bot to your server")
    async def invite(self, interaction: discord.Interaction) -> None:
        url = discord.utils.oauth_url(self.bot.user.id, permissions=discord.Permissions(permissions=8))
        await interaction.response.send_message(embed=base_embed("🔗 Invite Me", f"[Click here to invite]({url})"))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Utility(bot))
