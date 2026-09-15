import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.checks import require_admin
from utils.embeds import success_embed, panel_embed
from views.application_views import ApplicationPanelView


class Applications(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db

    @app_commands.command(name="application-create-type", description="Create/update an application type with up to 5 questions")
    @app_commands.describe(
        name="Application type name (e.g. Staff, Partner)",
        question1="Question 1", question2="Question 2", question3="Question 3",
        question4="Question 4", question5="Question 5",
    )
    @require_admin()
    async def create_type(self, interaction: discord.Interaction, name: str, question1: str,
                           question2: str | None = None, question3: str | None = None,
                           question4: str | None = None, question5: str | None = None):
        questions = [q for q in [question1, question2, question3, question4, question5] if q]
        await repo.set_application_type(self.db, interaction.guild_id, name, questions)
        await interaction.response.send_message(
            embed=success_embed("Application type saved", f"**{name}** now has {len(questions)} question(s)."),
            ephemeral=True,
        )

    @app_commands.command(name="application-panel", description="Post the application panel in this channel")
    @require_admin()
    async def application_panel(self, interaction: discord.Interaction):
        types = await repo.get_application_types(self.db, interaction.guild_id)
        embed = panel_embed("📝 Applications", "Select an application type below to apply.",
                             fields=[(t["app_type"], "Open", True) for t in types] or None)
        await interaction.channel.send(embed=embed, view=ApplicationPanelView(self.db, interaction.guild_id, [dict(t) for t in types]))
        await interaction.response.send_message("Application panel posted.", ephemeral=True)

    @app_commands.command(name="application-log-channel", description="Set where submitted applications are sent for review")
    @require_admin()
    async def set_log_channel(self, interaction: discord.Interaction, channel: discord.TextChannel):
        await repo.update_guild_settings(self.db, interaction.guild_id, application_log_channel_id=channel.id)
        await interaction.response.send_message(embed=success_embed("Saved", f"Applications will be reviewed in {channel.mention}."), ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Applications(bot))
