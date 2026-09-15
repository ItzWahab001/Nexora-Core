import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.checks import require_admin
from utils.embeds import panel_embed, success_embed


def render(template: str, member: discord.Member) -> str:
    return (template
            .replace("{user}", member.mention)
            .replace("{username}", member.display_name)
            .replace("{server}", member.guild.name)
            .replace("{count}", str(member.guild.member_count)))


class WelcomeConfigModal(discord.ui.Modal, title="Configure Welcome / Goodbye"):
    welcome_message = discord.ui.TextInput(label="Welcome message", style=discord.TextStyle.paragraph, max_length=500, required=False)
    goodbye_message = discord.ui.TextInput(label="Goodbye message", style=discord.TextStyle.paragraph, max_length=500, required=False)

    def __init__(self, db, current: dict):
        super().__init__()
        self.db = db
        self.welcome_message.default = current["welcome_message"]
        self.goodbye_message.default = current["goodbye_message"]

    async def on_submit(self, interaction: discord.Interaction):
        await repo.update_guild_settings(
            self.db, interaction.guild_id,
            welcome_message=str(self.welcome_message.value) or repo.DEFAULT_WELCOME,
            goodbye_message=str(self.goodbye_message.value) or repo.DEFAULT_GOODBYE,
        )
        await interaction.response.send_message(embed=success_embed("Saved", "Welcome/Goodbye messages updated.\nVariables: `{user}` `{username}` `{server}` `{count}`"), ephemeral=True)


class WelcomeConfigView(discord.ui.View):
    def __init__(self, db):
        super().__init__(timeout=180)
        self.db = db

    @discord.ui.select(cls=discord.ui.ChannelSelect, channel_types=[discord.ChannelType.text],
                        placeholder="Set the welcome/goodbye channel")
    async def set_channel(self, interaction: discord.Interaction, select: discord.ui.ChannelSelect):
        await repo.update_guild_settings(self.db, interaction.guild_id, welcome_channel_id=select.values[0].id)
        await interaction.response.send_message(embed=success_embed("Channel set", select.values[0].mention), ephemeral=True)

    @discord.ui.button(label="Edit Messages", style=discord.ButtonStyle.primary, emoji="📝")
    async def edit_messages(self, interaction: discord.Interaction, button: discord.ui.Button):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await interaction.response.send_modal(WelcomeConfigModal(self.db, settings))

    @discord.ui.button(label="Toggle Welcome", style=discord.ButtonStyle.secondary, emoji="👋")
    async def toggle_welcome(self, interaction: discord.Interaction, button: discord.ui.Button):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await repo.update_guild_settings(self.db, interaction.guild_id, welcome_enabled=int(not settings["welcome_enabled"]))
        await interaction.response.send_message("Toggled welcome messages.", ephemeral=True)

    @discord.ui.button(label="Toggle Goodbye", style=discord.ButtonStyle.secondary, emoji="🚪")
    async def toggle_goodbye(self, interaction: discord.Interaction, button: discord.ui.Button):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await repo.update_guild_settings(self.db, interaction.guild_id, goodbye_enabled=int(not settings["goodbye_enabled"]))
        await interaction.response.send_message("Toggled goodbye messages.", ephemeral=True)

    @discord.ui.button(label="Toggle Embed", style=discord.ButtonStyle.secondary, emoji="🖼️")
    async def toggle_embed(self, interaction: discord.Interaction, button: discord.ui.Button):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        await repo.update_guild_settings(self.db, interaction.guild_id, welcome_embed=int(not settings["welcome_embed"]))
        await interaction.response.send_message("Toggled embed style.", ephemeral=True)


class Welcome(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db

    @app_commands.command(name="welcome-panel", description="Open the Welcome/Goodbye configuration panel")
    @require_admin()
    async def welcome_panel(self, interaction: discord.Interaction):
        settings = await repo.get_guild_settings(self.db, interaction.guild_id)
        embed = panel_embed("👋 Welcome / Goodbye", "Configure join/leave messages.",
                             [("Welcome", "🟢 On" if settings["welcome_enabled"] else "🔴 Off", True),
                              ("Goodbye", "🟢 On" if settings["goodbye_enabled"] else "🔴 Off", True),
                              ("Embed style", "🟢 On" if settings["welcome_embed"] else "🔴 Off", True)])
        await interaction.response.send_message(embed=embed, view=WelcomeConfigView(self.db), ephemeral=True)

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        settings = await repo.get_guild_settings(self.db, member.guild.id)
        if not settings["welcome_enabled"] or not settings["welcome_channel_id"]:
            return
        channel = member.guild.get_channel(settings["welcome_channel_id"])
        if not isinstance(channel, discord.TextChannel):
            return
        text = render(settings["welcome_message"], member)
        if settings["welcome_embed"]:
            await channel.send(embed=success_embed("New Member!", text))
        else:
            await channel.send(text)

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        settings = await repo.get_guild_settings(self.db, member.guild.id)
        if not settings["goodbye_enabled"] or not settings["welcome_channel_id"]:
            return
        channel = member.guild.get_channel(settings["welcome_channel_id"])
        if not isinstance(channel, discord.TextChannel):
            return
        text = render(settings["goodbye_message"], member)
        if settings["welcome_embed"]:
            await channel.send(embed=panel_embed("Member Left", text))
        else:
            await channel.send(text)


async def setup(bot: commands.Bot):
    await bot.add_cog(Welcome(bot))
