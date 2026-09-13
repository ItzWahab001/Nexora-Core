"""
Ticket system: /ticket setup creates a persistent category-select panel in a
channel. Selecting a category opens a private ticket channel with a
persistent control view (Close / Claim / Add / Remove / Rename / Transcript
/ Delete). Both views use fixed custom_ids and are re-registered in
`setup_hook` (see main.py) so they keep working after a bot restart.
"""

from __future__ import annotations

import io

import discord
from discord import app_commands
from discord.ext import commands

from utils.checks import is_admin, member_is_staff
from utils.embeds import base_embed, error_embed, success_embed
from utils.logger import logger


class TicketCategorySelect(discord.ui.Select):
    """Persistent select menu rendered on a guild's ticket panel."""

    def __init__(self, panel_id: int, categories: list[dict]):
        options = [
            discord.SelectOption(
                label=c["label"], value=str(c["category_id"]), emoji=c.get("emoji") or "🎫"
            )
            for c in categories
        ]
        super().__init__(
            placeholder="Choose a ticket category...",
            options=options,
            custom_id=f"ticket_panel_select:{panel_id}",
            min_values=1,
            max_values=1,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        bot = interaction.client
        cog: "Tickets" = bot.get_cog("Tickets")  # type: ignore[assignment]
        await cog.create_ticket(interaction, int(self.values[0]))


class TicketPanelView(discord.ui.View):
    """Wraps TicketCategorySelect; persistent (timeout=None)."""

    def __init__(self, panel_id: int, categories: list[dict]):
        super().__init__(timeout=None)
        self.add_item(TicketCategorySelect(panel_id, categories))


class TicketControlView(discord.ui.View):
    """Persistent control panel posted inside every ticket channel."""

    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(label="Claim", emoji="👋", style=discord.ButtonStyle.primary, custom_id="ticket_claim")
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await member_is_staff(interaction):
            await interaction.response.send_message(
                embed=error_embed("Staff Only", "Only staff can claim tickets."), ephemeral=True
            )
            return
        await interaction.client.db.claim_ticket(interaction.channel_id, interaction.user.id)
        await interaction.response.send_message(
            embed=success_embed("Ticket Claimed", f"{interaction.user.mention} is now handling this ticket.")
        )

    @discord.ui.button(label="Add Member", emoji="➕", style=discord.ButtonStyle.secondary, custom_id="ticket_add")
    async def add_member(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await member_is_staff(interaction):
            await interaction.response.send_message(
                embed=error_embed("Staff Only", "Only staff can manage ticket members."), ephemeral=True
            )
            return
        await interaction.response.send_modal(TicketMemberModal(action="add"))

    @discord.ui.button(label="Remove Member", emoji="➖", style=discord.ButtonStyle.secondary, custom_id="ticket_remove")
    async def remove_member(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await member_is_staff(interaction):
            await interaction.response.send_message(
                embed=error_embed("Staff Only", "Only staff can manage ticket members."), ephemeral=True
            )
            return
        await interaction.response.send_modal(TicketMemberModal(action="remove"))

    @discord.ui.button(label="Rename", emoji="✏️", style=discord.ButtonStyle.secondary, custom_id="ticket_rename")
    async def rename(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await member_is_staff(interaction):
            await interaction.response.send_message(
                embed=error_embed("Staff Only", "Only staff can rename tickets."), ephemeral=True
            )
            return
        await interaction.response.send_modal(TicketRenameModal())

    @discord.ui.button(label="Transcript", emoji="📄", style=discord.ButtonStyle.secondary, custom_id="ticket_transcript")
    async def transcript(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await interaction.response.defer(ephemeral=True, thinking=True)
        lines = []
        async for msg in interaction.channel.history(limit=None, oldest_first=True):
            ts = msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
            content = msg.content or "[embed/attachment]"
            lines.append(f"[{ts}] {msg.author}: {content}")
        buffer = io.BytesIO("\n".join(lines).encode("utf-8"))
        file = discord.File(buffer, filename=f"transcript-{interaction.channel.name}.txt")
        await interaction.followup.send(file=file, ephemeral=True)

    @discord.ui.button(label="Close", emoji="🔒", style=discord.ButtonStyle.danger, custom_id="ticket_close")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        bot = interaction.client
        cog: "Tickets" = bot.get_cog("Tickets")  # type: ignore[assignment]
        await cog.close_ticket(interaction)

    @discord.ui.button(label="Delete", emoji="🗑️", style=discord.ButtonStyle.danger, custom_id="ticket_delete")
    async def delete(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await member_is_staff(interaction):
            await interaction.response.send_message(
                embed=error_embed("Staff Only", "Only staff can delete tickets."), ephemeral=True
            )
            return
        await interaction.response.send_message(embed=success_embed("Deleting", "This channel will be deleted shortly."))
        await interaction.client.db.close_ticket(interaction.channel_id)
        await interaction.channel.delete(reason=f"Ticket deleted by {interaction.user}")


class TicketMemberModal(discord.ui.Modal):
    member_input = discord.ui.TextInput(label="User ID or @mention", placeholder="123456789012345678")

    def __init__(self, action: str) -> None:
        super().__init__(title="Add Member" if action == "add" else "Remove Member")
        self.action = action

    async def on_submit(self, interaction: discord.Interaction) -> None:
        raw = self.member_input.value.strip().strip("<@!>")
        if not raw.isdigit():
            await interaction.response.send_message(
                embed=error_embed("Invalid Input", "Please provide a valid user ID or mention."),
                ephemeral=True,
            )
            return
        member = interaction.guild.get_member(int(raw))
        if member is None:
            await interaction.response.send_message(
                embed=error_embed("Not Found", "That user isn't in this server."), ephemeral=True
            )
            return
        overwrite = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)
        if self.action == "add":
            await interaction.channel.set_permissions(member, overwrite=overwrite)
            await interaction.response.send_message(
                embed=success_embed("Member Added", f"{member.mention} can now see this ticket.")
            )
        else:
            await interaction.channel.set_permissions(member, overwrite=None)
            await interaction.response.send_message(
                embed=success_embed("Member Removed", f"{member.mention} no longer has access.")
            )


class TicketRenameModal(discord.ui.Modal, title="Rename Ticket"):
    new_name = discord.ui.TextInput(label="New channel name", max_length=90)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        await interaction.channel.edit(name=self.new_name.value)
        await interaction.response.send_message(embed=success_embed("Renamed", f"Channel renamed to **{self.new_name.value}**."))


class TicketCategoryModal(discord.ui.Modal, title="Add Ticket Category"):
    label = discord.ui.TextInput(label="Category label", placeholder="General Support", max_length=80)
    emoji = discord.ui.TextInput(label="Emoji (optional)", placeholder="📩", required=False, max_length=10)
    role_id = discord.ui.TextInput(label="Support role ID (optional)", required=False, max_length=25)

    def __init__(self, panel_id: int) -> None:
        super().__init__()
        self.panel_id = panel_id

    async def on_submit(self, interaction: discord.Interaction) -> None:
        bot = interaction.client
        role_id = int(self.role_id.value) if self.role_id.value.strip().isdigit() else None
        await bot.db.add_ticket_category(
            self.panel_id, interaction.guild_id, self.label.value, self.emoji.value or None, role_id
        )
        cog: "Tickets" = bot.get_cog("Tickets")  # type: ignore[assignment]
        await cog.refresh_panel(interaction.guild, self.panel_id)
        await interaction.response.send_message(
            embed=success_embed("Category Added", f"Added **{self.label.value}** to the ticket panel.")
        )


class Tickets(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    ticket_group = app_commands.Group(name="ticket", description="Manage the ticket system")

    @ticket_group.command(name="setup", description="Post a new ticket panel in this channel")
    @is_admin()
    @app_commands.describe(channel="Channel to post the panel in (defaults to current channel)")
    async def setup(self, interaction: discord.Interaction, channel: discord.TextChannel | None = None) -> None:
        channel = channel or interaction.channel
        panel_id = await self.bot.db.create_ticket_panel(interaction.guild_id, channel.id)
        # Default starter category so the panel isn't empty.
        await self.bot.db.add_ticket_category(panel_id, interaction.guild_id, "General Support", "📩", None)

        embed = base_embed(
            "🎫 Support Center",
            "Need help? Choose a category below to create a ticket.",
        )
        categories = [dict(r) for r in await self.bot.db.get_panel_categories(panel_id)]
        view = TicketPanelView(panel_id, categories)
        message = await channel.send(embed=embed, view=view)
        await self.bot.db.set_panel_message(panel_id, message.id)

        await interaction.response.send_message(
            embed=success_embed("Panel Created", f"Ticket panel posted in {channel.mention}."), ephemeral=True
        )

    @ticket_group.command(name="add_category", description="Add a category to an existing ticket panel")
    @is_admin()
    async def add_category(self, interaction: discord.Interaction, panel_id: int) -> None:
        panel = await self.bot.db.get_panel(panel_id)
        if not panel or panel["guild_id"] != interaction.guild_id:
            await interaction.response.send_message(
                embed=error_embed("Not Found", "No ticket panel with that ID in this server."), ephemeral=True
            )
            return
        await interaction.response.send_modal(TicketCategoryModal(panel_id))

    @ticket_group.command(name="config", description="Configure ticket category, log and transcript channels")
    @is_admin()
    async def config(
        self,
        interaction: discord.Interaction,
        category: discord.CategoryChannel | None = None,
        log_channel: discord.TextChannel | None = None,
        transcript_channel: discord.TextChannel | None = None,
    ) -> None:
        fields = {}
        if category:
            fields["category_channel_id"] = category.id
        if log_channel:
            fields["log_channel_id"] = log_channel.id
        if transcript_channel:
            fields["transcript_channel_id"] = transcript_channel.id
        await self.bot.db.upsert_ticket_config(interaction.guild_id, **fields)
        await interaction.response.send_message(embed=success_embed("Ticket Settings Updated"), ephemeral=True)

    async def refresh_panel(self, guild: discord.Guild, panel_id: int) -> None:
        panel = await self.bot.db.get_panel(panel_id)
        if not panel or not panel["message_id"]:
            return
        channel = guild.get_channel(panel["channel_id"])
        if channel is None:
            return
        try:
            message = await channel.fetch_message(panel["message_id"])
        except discord.NotFound:
            return
        categories = [dict(r) for r in await self.bot.db.get_panel_categories(panel_id)]
        await message.edit(view=TicketPanelView(panel_id, categories))

    async def create_ticket(self, interaction: discord.Interaction, category_id: int) -> None:
        guild = interaction.guild
        existing = await self.bot.db.user_open_ticket(guild.id, interaction.user.id)
        if existing:
            await interaction.response.send_message(
                embed=error_embed("Ticket Already Open", f"You already have an open ticket: <#{existing['channel_id']}>"),
                ephemeral=True,
            )
            return

        category_row = await self.bot.db.fetchone(
            "SELECT * FROM ticket_categories WHERE category_id = ?", (category_id,)
        )
        if not category_row:
            await interaction.response.send_message(embed=error_embed("Category Not Found"), ephemeral=True)
            return

        config = await self.bot.db.get_ticket_config(guild.id)
        category_channel = guild.get_channel(config["category_channel_id"]) if config and config["category_channel_id"] else None

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            interaction.user: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
            guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, manage_channels=True),
        }
        support_role_id = category_row["support_role_id"]
        if support_role_id:
            role = guild.get_role(support_role_id)
            if role:
                overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)

        channel_name = f"ticket-{interaction.user.name}".lower()[:90]
        channel = await guild.create_text_channel(
            channel_name,
            category=category_channel if isinstance(category_channel, discord.CategoryChannel) else None,
            overwrites=overwrites,
            reason=f"Ticket opened by {interaction.user}",
        )
        await self.bot.db.create_ticket(guild.id, channel.id, interaction.user.id, category_row["label"])

        embed = base_embed(
            "🎫 Ticket Created",
            f"Welcome {interaction.user.mention}!\n\nPlease explain your issue and wait for the support team.",
        )
        embed.add_field(name="Category", value=category_row["label"])
        mention = f"<@&{support_role_id}>" if support_role_id else ""
        await channel.send(content=f"{interaction.user.mention} {mention}".strip(), embed=embed, view=TicketControlView())

        await interaction.response.send_message(
            embed=success_embed("Ticket Created", f"Your ticket has been created: {channel.mention}"), ephemeral=True
        )

        logging_cog = self.bot.get_cog("LoggingCog")
        if logging_cog:
            await logging_cog.log_event(guild, "ticket", f"🎫 Ticket opened by {interaction.user.mention} ({category_row['label']}) -> {channel.mention}")

    async def close_ticket(self, interaction: discord.Interaction) -> None:
        ticket = await self.bot.db.get_ticket_by_channel(interaction.channel_id)
        if not ticket:
            await interaction.response.send_message(embed=error_embed("Not a Ticket Channel"), ephemeral=True)
            return
        await self.bot.db.close_ticket(interaction.channel_id)
        await interaction.channel.set_permissions(interaction.guild.get_member(ticket["owner_id"]) or discord.Object(id=ticket["owner_id"]), overwrite=discord.PermissionOverwrite(view_channel=False))
        await interaction.response.send_message(embed=success_embed("Ticket Closed", "This ticket has been closed. Use Delete to remove the channel."))

        logging_cog = self.bot.get_cog("LoggingCog")
        if logging_cog:
            await logging_cog.log_event(interaction.guild, "ticket", f"🔒 Ticket closed by {interaction.user.mention} in {interaction.channel.mention}")


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Tickets(bot))
