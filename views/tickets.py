import discord

class TicketPanelView(discord.ui.View):
    def __init__(self, bot):
        super().__init__(timeout=None)
        self.bot = bot

    @discord.ui.button(label="Create Ticket", emoji="🎫", style=discord.ButtonStyle.primary, custom_id="ticket:create")
    async def create(self, interaction, button):
        cog = self.bot.get_cog("Tickets")
        if cog:
            await cog.create_ticket(interaction)

class TicketControlView(discord.ui.View):
    def __init__(self, bot, ticket_id):
        super().__init__(timeout=None)
        self.bot, self.ticket_id = bot, ticket_id

    @discord.ui.button(label="Claim", emoji="🙋", style=discord.ButtonStyle.secondary, custom_id="ticket:claim")
    async def claim(self, interaction, button):
        cog = self.bot.get_cog("Tickets")
        await cog.claim_ticket(interaction, self.ticket_id)

    @discord.ui.button(label="Close", emoji="🔒", style=discord.ButtonStyle.danger, custom_id="ticket:close")
    async def close(self, interaction, button):
        cog = self.bot.get_cog("Tickets")
        await cog.close_ticket(interaction, self.ticket_id)
