import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.checks import require_admin
from utils.embeds import panel_embed, success_embed


class Settings(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db

    @app_commands.command(name="settings-overview", description="View all bot configuration for this server")
    @require_admin()
    async def overview(self, interaction: discord.Interaction):
        s = await repo.get_guild_settings(self.db, interaction.guild_id)
        g = interaction.guild

        def ch(cid):
            c = g.get_channel(cid) if cid else None
            return c.mention if c else "Not set"

        def role(rid):
            r = g.get_role(rid) if rid else None
            return r.mention if r else "Not set"

        embed = panel_embed(
            "🔧 Bot Settings Overview", "",
            fields=[
                ("Prefix", s["prefix"], True),
                ("Onboarding", "🟢" if s["onboarding_enabled"] else "🔴", True),
                ("Onboarding VC", ch(s["onboarding_vc_id"]), True),
                ("Verification Channel", ch(s["verification_channel_id"]), True),
                ("Unverified Role", role(s["unverified_role_id"]), True),
                ("Verified Role", role(s["verified_role_id"]), True),
                ("Welcome Channel", ch(s["welcome_channel_id"]), True),
                ("Mod Log", ch(s["mod_log_channel_id"]), True),
                ("Ticket Category", ch(s["ticket_category_id"]), True),
                ("Ticket Log", ch(s["ticket_log_channel_id"]), True),
                ("Application Log", ch(s["application_log_channel_id"]), True),
                ("AI Channel", ch(s["ai_channel_id"]), True),
                ("AI Enabled", "🟢" if s["ai_enabled"] else "🔴", True),
            ],
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="set-prefix", description="Change the custom-command / text prefix")
    @require_admin()
    async def set_prefix(self, interaction: discord.Interaction, prefix: str):
        await repo.update_guild_settings(self.db, interaction.guild_id, prefix=prefix[:5])
        await interaction.response.send_message(embed=success_embed("Prefix updated", f"New prefix: `{prefix}`"), ephemeral=True)

    @commands.command(name="sync")
    @commands.is_owner()
    async def sync(self, ctx: commands.Context):
        """Owner-only: sync slash commands (text command: !sync)."""
        synced = await self.bot.tree.sync()
        await ctx.send(f"Synced {len(synced)} application commands.")

    @commands.command(name="sync-guild")
    @commands.is_owner()
    async def sync_guild(self, ctx: commands.Context):
        """Owner-only: sync instantly to the current guild for fast testing."""
        self.bot.tree.copy_global_to(guild=ctx.guild)
        synced = await self.bot.tree.sync(guild=ctx.guild)
        await ctx.send(f"Synced {len(synced)} commands to this guild.")


async def setup(bot: commands.Bot):
    await bot.add_cog(Settings(bot))
