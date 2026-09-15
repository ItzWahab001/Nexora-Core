import discord

from database import repo
from database.db import Database, loads
from utils.embeds import success_embed, error_embed, panel_embed
from utils.checks import is_staff


class DynamicApplicationModal(discord.ui.Modal):
    """Built at runtime from the guild's configured questions (max 5 — a
    hard Discord modal limit)."""

    def __init__(self, db: Database, app_type: str, questions: list[str]):
        super().__init__(title=f"{app_type} Application"[:45])
        self.db = db
        self.app_type = app_type
        self.inputs: list[discord.ui.TextInput] = []
        for q in questions[:5]:
            ti = discord.ui.TextInput(label=q[:45], style=discord.TextStyle.paragraph, required=True, max_length=1000)
            self.inputs.append(ti)
            self.add_item(ti)

    async def on_submit(self, interaction: discord.Interaction):
        answers = {ti.label: str(ti.value) for ti in self.inputs}
        app_id = await repo.submit_application(self.db, interaction.guild_id, interaction.user.id, self.app_type, answers)

        await interaction.response.send_message(
            embed=success_embed("Application submitted", "Staff will review it soon and notify you."), ephemeral=True
        )

        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        log_ch = interaction.guild.get_channel(settings["application_log_channel_id"]) if settings["application_log_channel_id"] else None
        if isinstance(log_ch, discord.TextChannel):
            embed = panel_embed(
                f"📝 New Application #{app_id} — {self.app_type}",
                f"Applicant: {interaction.user.mention}",
                fields=[(q, a[:1000], False) for q, a in answers.items()],
            )
            await log_ch.send(embed=embed, view=ApplicationReviewView(self.db, app_id))


class ApplicationPanelView(discord.ui.View):
    """Persistent panel — select an application type to fill out a modal."""

    def __init__(self, db: Database, app_types: list[dict], guild_id: int | None = None):
        super().__init__(timeout=None)
        self.db = db
        self.guild_id = guild_id
        custom_id = f"applications:select:{guild_id}" if guild_id else "applications:select"
        options = [discord.SelectOption(label=t["app_type"], value=t["app_type"]) for t in app_types] or \
                  [discord.SelectOption(label="No applications open", value="__none__")]
        select = discord.ui.Select(placeholder="📝 Choose an application to apply for",
                                    options=options, custom_id=custom_id)
        select.callback = self.on_select
        self.add_item(select)

    async def on_select(self, interaction: discord.Interaction):
        value = interaction.data["values"][0]
        if value == "__none__":
            await interaction.response.send_message("No applications are currently open.", ephemeral=True)
            return
        row = await self.db.fetchone(
            "SELECT * FROM application_types WHERE guild_id=? AND app_type=?", (interaction.guild_id, value)
        )
        if not row:
            await interaction.response.send_message("That application type no longer exists.", ephemeral=True)
            return
        questions = loads(row["questions"], [])
        await interaction.response.send_modal(DynamicApplicationModal(self.db, value, questions))


class ApplicationReviewView(discord.ui.View):
    def __init__(self, db: Database, application_id: int):
        super().__init__(timeout=None)
        self.db = db
        self.application_id = application_id
        self.accept.custom_id = f"applications:accept:{application_id}"
        self.deny.custom_id = f"applications:deny:{application_id}"

    async def _resolve(self, interaction: discord.Interaction, status: str, style_label: str):
        if not isinstance(interaction.user, discord.Member) or not is_staff(interaction.user):
            await interaction.response.send_message("Only staff can review applications.", ephemeral=True)
            return
        app = await repo.get_application(self.db, self.application_id)
        if not app:
            await interaction.response.send_message("Application not found.", ephemeral=True)
            return
        if app["status"] != "pending":
            await interaction.response.send_message(
                embed=error_embed("Already reviewed", f"This application was already **{app['status']}**."),
                ephemeral=True,
            )
            return
        await repo.review_application(self.db, self.application_id, interaction.user.id, status)
        for child in self.children:
            child.disabled = True
        await interaction.response.edit_message(view=self)
        await interaction.followup.send(
            embed=success_embed(f"Application {style_label}", f"By {interaction.user.mention}"), ephemeral=False
        )
        applicant = interaction.guild.get_member(app["user_id"])
        if applicant:
            try:
                await applicant.send(f"Your application in **{interaction.guild.name}** was **{status}**.")
            except discord.Forbidden:
                pass

    @discord.ui.button(label="Accept", style=discord.ButtonStyle.success, emoji="✅")
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._resolve(interaction, "accepted", "Accepted")

    @discord.ui.button(label="Deny", style=discord.ButtonStyle.danger, emoji="❌")
    async def deny(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._resolve(interaction, "denied", "Denied")
