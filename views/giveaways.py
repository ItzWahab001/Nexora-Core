import discord

class GiveawayView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=None)
        self.bot = bot

    @discord.ui.button(label="Enter Giveaway", emoji="🎁", style=discord.ButtonStyle.success, custom_id="giveaway:enter")
    async def enter(self, interaction, button):
        cog = self.bot.get_cog("Giveaways")
        await cog.enter(interaction)
