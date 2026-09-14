import discord

class ApplicationModal(discord.ui.Modal, title="Community Application"):
    answer1 = discord.ui.TextInput(label="Why do you want to join?", style=discord.TextStyle.paragraph, max_length=1000)
    answer2 = discord.ui.TextInput(label="Tell us about yourself", style=discord.TextStyle.paragraph, max_length=1000)
    def __init__(self, bot):
        super().__init__()
        self.bot = bot
    async def on_submit(self, interaction):
        cog = self.bot.get_cog("Applications")
        await cog.submit(interaction, str(self.answer1), str(self.answer2))

class ApplicationPanelView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=None)
        self.bot = bot
    @discord.ui.button(label="Apply", emoji="📝", style=discord.ButtonStyle.primary, custom_id="application:apply")
    async def apply(self, interaction, button):
        await interaction.response.send_modal(ApplicationModal(self.bot))
