import discord

from database import repo
from database.db import Database
from utils.embeds import success_embed, error_embed, panel_embed
from utils.checks import is_staff


TICKET_CATEGORIES = ["General Support", "Billing", "Report a User", "Partnership"]


class TicketPanelView(discord.ui.View):
    """Posted once in a #open-a-ticket channel. Persistent."""

    def __init__(self, db: Database):
        super().__init__(timeout=None)
        self.db = db

    @discord.ui.select(
        placeholder="📩 Select a ticket category to open a ticket",
        custom_id="tickets:open_select",
        options=[discord.SelectOption(label=c, value=c) for c in TICKET_CATEGORIES],
    )
    async def open_ticket(self, interaction: discord.Interaction, select: discord.ui.Select):
        guild = interaction.guild
        member = interaction.user
        category_name = select.values[0]

        open_count = await repo.count_open_tickets(self.db, guild.id)
        settings = await repo.get_guild_settings(self.db, guild.id)
        category_channel = guild.get_channel(settings["ticket_category_id"]) if settings["ticket_category_id"] else None

        # Prevent a member from having multiple simultaneous open tickets of the same kind.
        existing = discord.utils.get(guild.text_channels, topic=f"ticket-owner:{member.id}")
        if existing:
            await interaction.response.send_message(
                embed=error_embed("Ticket already open", f"You already have an open ticket: {existing.mention}"),
                ephemeral=True,
            )
            return

        ticket_id = await repo.create_ticket(self.db, guild.id, member.id, category_name)

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            member: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
            guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, manage_channels=True),
        }
        channel = await guild.create_text_channel(
            name=f"ticket-{ticket_id}-{member.name}"[:95],
            category=category_channel if isinstance(category_channel, discord.CategoryChannel) else None,
            overwrites=overwrites,
            topic=f"ticket-owner:{member.id}",
            reason=f"Ticket opened by {member}",
        )
        await repo.set_ticket_channel(self.db, ticket_id, channel.id)

        embed = panel_embed(
            f"🎫 Ticket #{ticket_id} — {category_name}",
            f"{member.mention} thanks for reaching out. Staff will be with you shortly.\nUse the buttons below to manage this ticket.",
        )
        await channel.send(embed=embed, view=TicketControlView(self.db))
        await interaction.response.send_message(
            embed=success_embed("Ticket created", f"Your ticket: {channel.mention}"), ephemeral=True
        )


class TicketControlView(discord.ui.View):
    """Posted inside each ticket channel. Persistent."""

    def __init__(self, db: Database):
        super().__init__(timeout=None)
        self.db = db

    @discord.ui.button(label="Claim", style=discord.ButtonStyle.primary, emoji="🙋", custom_id="tickets:claim")
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button):
        if not isinstance(interaction.user, discord.Member) or not is_staff(interaction.user):
            await interaction.response.send_message("Only staff can claim tickets.", ephemeral=True)
            return
        ticket = await repo.get_ticket_by_channel(self.db, interaction.channel_id)
        if not ticket:
            await interaction.response.send_message("This isn't a ticket channel.", ephemeral=True)
            return
        await repo.claim_ticket(self.db, ticket["ticket_id"], interaction.user.id)
        await interaction.response.send_message(
            embed=success_embed("Ticket claimed", f"{interaction.user.mention} is now handling this ticket.")
        )

    @discord.ui.button(label="Close", style=discord.ButtonStyle.danger, emoji="🔒", custom_id="tickets:close")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button):
        ticket = await repo.get_ticket_by_channel(self.db, interaction.channel_id)
        if not ticket:
            await interaction.response.send_message("This isn't a ticket channel.", ephemeral=True)
            return
        is_owner = interaction.user.id == ticket["user_id"]
        if not (is_owner or (isinstance(interaction.user, discord.Member) and is_staff(interaction.user))):
            await interaction.response.send_message("Only the ticket owner or staff can close this.", ephemeral=True)
            return
        await interaction.response.send_modal(CloseReasonModal(self.db, ticket["ticket_id"]))

    @discord.ui.button(label="Transcript", style=discord.ButtonStyle.secondary, emoji="📄", custom_id="tickets:transcript")
    async def transcript(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer(ephemeral=True, thinking=True)
        lines = []
        async for msg in interaction.channel.history(limit=500, oldest_first=True):
            ts = msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
            lines.append(f"[{ts}] {msg.author}: {msg.content}")
        text = "\n".join(lines) or "No messages."
        import io
        buf = io.BytesIO(text.encode("utf-8"))
        await interaction.followup.send(
            "Transcript generated.", file=discord.File(buf, filename=f"transcript-{interaction.channel.name}.txt"),
            ephemeral=True,
        )


class CloseReasonModal(discord.ui.Modal, title="Close Ticket"):
    reason = discord.ui.TextInput(label="Reason for closing", required=False, max_length=300)

    def __init__(self, db: Database, ticket_id: int):
        super().__init__()
        self.db = db
        self.ticket_id = ticket_id

    async def on_submit(self, interaction: discord.Interaction):
        await repo.close_ticket(self.db, self.ticket_id, str(self.reason.value) or "No reason given")
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await interaction.response.send_message(
            embed=success_embed("Ticket closing", "This channel will be deleted in 10 seconds.")
        )
        log_ch = interaction.guild.get_channel(settings["ticket_log_channel_id"]) if settings["ticket_log_channel_id"] else None
        if isinstance(log_ch, discord.TextChannel):
            await log_ch.send(embed=success_embed(
                f"Ticket #{self.ticket_id} closed",
                f"Closed by {interaction.user.mention}\nReason: {self.reason.value or 'No reason given'}",
            ))
        import asyncio
        await asyncio.sleep(10)
        try:
            await interaction.channel.delete(reason="Ticket closed")
        except discord.NotFound:
            pass
