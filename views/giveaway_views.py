import discord

from database import repo
from database.db import Database
from utils.embeds import success_embed, error_embed


class GiveawayView(discord.ui.View):
    """Persistent — one instance per active giveaway message, custom_id
    encodes the giveaway_id so it survives restarts."""

    def __init__(self, db: Database, giveaway_id: int):
        super().__init__(timeout=None)
        self.db = db
        self.giveaway_id = giveaway_id
        self.enter.custom_id = f"giveaway:enter:{giveaway_id}"

    @discord.ui.button(label="🎉 Enter Giveaway", style=discord.ButtonStyle.success)
    async def enter(self, interaction: discord.Interaction, button: discord.ui.Button):
        giveaway = await self.db.fetchone(
            "SELECT * FROM giveaways WHERE giveaway_id=?", (self.giveaway_id,)
        )
        if not giveaway or giveaway["status"] != "active":
            await interaction.response.send_message(
                embed=error_embed("Giveaway ended", "This giveaway is no longer active."), ephemeral=True
            )
            return

        if giveaway["requirement_role_id"]:
            role = interaction.guild.get_role(giveaway["requirement_role_id"])
            if role and role not in interaction.user.roles:
                await interaction.response.send_message(
                    embed=error_embed("Not eligible", f"You need the {role.mention} role to enter."), ephemeral=True
                )
                return

        added = await repo.add_entry(self.db, self.giveaway_id, interaction.user.id)
        if not added:
            await interaction.response.send_message(
                embed=error_embed("Already entered", "You've already entered this giveaway."), ephemeral=True
            )
            return

        entries = await repo.get_entries(self.db, self.giveaway_id)
        await interaction.response.send_message(
            embed=success_embed("Entered!", f"Good luck! There are now **{len(entries)}** entries."), ephemeral=True
        )


def rebuild_view_for_persistence(db: Database, giveaway_id: int) -> GiveawayView:
    """Used on bot startup to re-register persistent views for active giveaways."""
    return GiveawayView(db, giveaway_id)
