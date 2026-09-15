import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.checks import require_admin, is_staff
from utils.embeds import success_embed
from views.ticket_views import TicketPanelView, TicketControlView


class Tickets(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db

    @app_commands.command(name="ticket-panel", description="Post the ticket-opening panel in this channel")
    @require_admin()
    async def ticket_panel(self, interaction: discord.Interaction):
        embed = success_embed("🎫 Need Help?", "Select a category below to open a private ticket with staff.")
        await interaction.channel.send(embed=embed, view=TicketPanelView(self.db))
        await interaction.response.send_message("Ticket panel posted.", ephemeral=True)

    @app_commands.command(name="ticket-settings", description="Configure the ticket category and log channel")
    @app_commands.describe(category="Category new tickets are created under", log_channel="Where closed-ticket logs go")
    @require_admin()
    async def ticket_settings(self, interaction: discord.Interaction,
                               category: discord.CategoryChannel | None = None,
                               log_channel: discord.TextChannel | None = None):
        fields = {}
        if category:
            fields["ticket_category_id"] = category.id
        if log_channel:
            fields["ticket_log_channel_id"] = log_channel.id
        if fields:
            await repo.update_guild_settings(self.db, interaction.guild_id, **fields)
        await interaction.response.send_message(embed=success_embed("Ticket settings updated"), ephemeral=True)

    @app_commands.command(name="ticket-add", description="Add a user to the current ticket")
    async def ticket_add(self, interaction: discord.Interaction, member: discord.Member):
        ticket = await repo.get_ticket_by_channel(self.db, interaction.channel_id)
        if not ticket:
            await interaction.response.send_message("This isn't a ticket channel.", ephemeral=True)
            return
        if not isinstance(interaction.user, discord.Member) or not is_staff(interaction.user):
            await interaction.response.send_message("Only staff can manage ticket members.", ephemeral=True)
            return
        await interaction.channel.set_permissions(member, view_channel=True, send_messages=True, read_message_history=True)
        await interaction.response.send_message(embed=success_embed("User added", f"{member.mention} can now see this ticket."))

    @app_commands.command(name="ticket-remove", description="Remove a user from the current ticket")
    async def ticket_remove(self, interaction: discord.Interaction, member: discord.Member):
        ticket = await repo.get_ticket_by_channel(self.db, interaction.channel_id)
        if not ticket:
            await interaction.response.send_message("This isn't a ticket channel.", ephemeral=True)
            return
        if not isinstance(interaction.user, discord.Member) or not is_staff(interaction.user):
            await interaction.response.send_message("Only staff can manage ticket members.", ephemeral=True)
            return
        await interaction.channel.set_permissions(member, overwrite=None)
        await interaction.response.send_message(embed=success_embed("User removed", f"{member.mention} no longer has access."))

    @app_commands.command(name="ticket-rename", description="Rename the current ticket channel")
    async def ticket_rename(self, interaction: discord.Interaction, new_name: str):
        ticket = await repo.get_ticket_by_channel(self.db, interaction.channel_id)
        if not ticket:
            await interaction.response.send_message("This isn't a ticket channel.", ephemeral=True)
            return
        if not isinstance(interaction.user, discord.Member) or not is_staff(interaction.user):
            await interaction.response.send_message("Only staff can rename tickets.", ephemeral=True)
            return
        await interaction.channel.edit(name=new_name[:95])
        await interaction.response.send_message(embed=success_embed("Renamed", f"Channel renamed to `{new_name}`."))

    @app_commands.command(name="ticket-reopen", description="Reopen a closed ticket by ID")
    async def ticket_reopen(self, interaction: discord.Interaction, ticket_id: int):
        if not isinstance(interaction.user, discord.Member) or not is_staff(interaction.user):
            await interaction.response.send_message("Only staff can reopen tickets.", ephemeral=True)
            return
        await self.db.execute("UPDATE tickets SET status='open', closed_at=NULL WHERE ticket_id=?", (ticket_id,))
        await interaction.response.send_message(embed=success_embed("Ticket reopened", f"Ticket #{ticket_id} marked open again."), ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Tickets(bot))
