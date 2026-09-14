import discord

class VerificationView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=None)
        self.bot = bot

    @discord.ui.button(label="Verify", emoji="✅", style=discord.ButtonStyle.success, custom_id="verify:member")
    async def verify(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.bot.get_cog("Verification")
        if not cog:
            return await interaction.response.send_message("Verification system is unavailable.", ephemeral=True)
        await cog.verify_member(interaction)
