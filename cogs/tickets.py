import discord
from discord.ext import commands
from utils.embeds import embed
from utils.helpers import clean_name
from views.tickets import TicketPanelView, TicketControlView

class Tickets(commands.Cog):
    def __init__(self, bot): self.bot = bot

    @commands.hybrid_command(name="ticket-panel")
    @commands.has_guild_permissions(manage_guild=True)
    async def panel(self, ctx):
        await ctx.send(embed=embed("🎫 Support Tickets", "Create a private support ticket with the button below."),
                       view=TicketPanelView(self.bot))

    async def create_ticket(self, interaction):
        guild, member = interaction.guild, interaction.user
        existing = await self.bot.db.fetchone(
            "SELECT * FROM tickets WHERE guild_id=? AND opener_id=? AND status='open'", (guild.id, member.id))
        if existing:
            return await interaction.response.send_message(f"You already have an open ticket: <#{existing['channel_id']}>", ephemeral=True)
        s = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (guild.id,))
        staff_role = guild.get_role(s["staff_role_id"]) if s and s["staff_role_id"] else None
        overwrites = {guild.default_role: discord.PermissionOverwrite(view_channel=False),
                      member: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)}
        if staff_role:
            overwrites[staff_role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)
        category = guild.get_channel(s["ticket_category_id"]) if s and s["ticket_category_id"] else None
        channel = await guild.create_text_channel(f"ticket-{clean_name(member.display_name)}", overwrites=overwrites, category=category)
        cur = await self.bot.db.execute("INSERT INTO tickets(guild_id,channel_id,opener_id) VALUES(?,?,?)",
                                        (guild.id, channel.id, member.id))
        ticket_id = cur.lastrowid
        await channel.send(embed=embed("🎫 Ticket Opened", "A staff member can claim this ticket. Use Close when resolved."),
                            view=TicketControlView(self.bot, ticket_id))
        await interaction.response.send_message(f"Ticket created: {channel.mention}", ephemeral=True)

    async def claim_ticket(self, interaction, ticket_id):
        s = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (interaction.guild.id,))
        staff = s["staff_role_id"] if s else None
        if not interaction.user.guild_permissions.manage_channels and not any(r.id == staff for r in interaction.user.roles):
            return await interaction.response.send_message("Staff only.", ephemeral=True)
        await self.bot.db.execute("UPDATE tickets SET claimed_by=? WHERE id=?", (interaction.user.id, ticket_id))
        await interaction.response.send_message(f"Claimed by {interaction.user.mention}.")

    async def close_ticket(self, interaction, ticket_id):
        s = await self.bot.db.fetchone("SELECT * FROM guild_settings WHERE guild_id=?", (interaction.guild.id,))
        if not interaction.user.guild_permissions.manage_channels and not any(r.id == s["staff_role_id"] for r in interaction.user.roles):
            return await interaction.response.send_message("Staff only.", ephemeral=True)
        await self.bot.db.execute("UPDATE tickets SET status='closed',closed_at=CURRENT_TIMESTAMP WHERE id=?", (ticket_id,))
        await interaction.response.send_message("Ticket closed. Channel will be archived shortly.")
        await interaction.channel.edit(name=f"closed-{interaction.channel.name}"[:100])
        await interaction.channel.set_permissions(interaction.guild.default_role, view_channel=False)

async def setup(bot): await bot.add_cog(Tickets(bot))
