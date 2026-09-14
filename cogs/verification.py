import discord
from discord.ext import commands
from utils.embeds import embed

class Verification(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def verify_member(self, interaction):
        guild = interaction.guild
        member = interaction.user
        settings = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (guild.id,))
        if not settings:
            return await interaction.response.send_message("Verification is not configured.", ephemeral=True)
        role = guild.get_role(settings["verified_role_id"]) if settings["verified_role_id"] else None
        new_role = guild.get_role(settings["new_member_role_id"]) if settings["new_member_role_id"] else None
        if not role:
            return await interaction.response.send_message("Verified role is missing.", ephemeral=True)
        try:
            await member.add_roles(role, reason="Member verification")
            if new_role:
                await member.remove_roles(new_role, reason="Member verification")
            await self.bot.db.execute(
                "INSERT INTO verification(guild_id,user_id,verified_at) VALUES(?,?,CURRENT_TIMESTAMP) "
                "ON CONFLICT(guild_id,user_id) DO UPDATE SET verified_at=CURRENT_TIMESTAMP",
                (guild.id, member.id))
            await self.bot.db.execute(
                "INSERT INTO members(guild_id,user_id,joined_at,verified) VALUES(?,?,CURRENT_TIMESTAMP,1) "
                "ON CONFLICT(guild_id,user_id) DO UPDATE SET verified=1",
                (guild.id, member.id))
            await interaction.response.send_message(embed=embed("✅ Verified", "Your community access has been unlocked."), ephemeral=True)
        except discord.Forbidden:
            await interaction.response.send_message("I cannot manage the configured roles. Check role hierarchy and permissions.", ephemeral=True)

    @commands.hybrid_group(name="verification", fallback="status")
    @commands.has_guild_permissions(manage_guild=True)
    async def verification(self, ctx):
        await ctx.send(embed=embed("Server Verification", "Click **Verify** to unlock the community."), view=__import__("views.verification", fromlist=["VerificationView"]).VerificationView(self.bot))

    @verification.command(name="panel")
    async def panel(self, ctx):
        await ctx.send(embed=embed("Server Verification", "Complete verification to unlock access."),
                       view=__import__("views.verification", fromlist=["VerificationView"]).VerificationView(self.bot))

async def setup(bot):
    await bot.add_cog(Verification(bot))
