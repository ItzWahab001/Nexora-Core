import time

import discord
from discord import app_commands
from discord.ext import commands

from database import repo
from utils.checks import require_admin
from utils.embeds import success_embed, error_embed, panel_embed


class ManageCommandsView(discord.ui.View):
    def __init__(self, db, rows: list[dict]):
        super().__init__(timeout=180)
        self.db = db
        options = [discord.SelectOption(label=r["name"], description="Enabled" if r["enabled"] else "Disabled")
                   for r in rows] or [discord.SelectOption(label="No commands yet", value="__none__")]
        select = discord.ui.Select(placeholder="Select a command to manage", options=options[:25])
        select.callback = self.on_select
        self.add_item(select)
        self.selected_name: str | None = None

    async def on_select(self, interaction: discord.Interaction):
        value = interaction.data["values"][0]
        if value == "__none__":
            await interaction.response.send_message("No custom commands exist yet.", ephemeral=True)
            return
        self.selected_name = value
        await interaction.response.send_message(
            f"Selected `{value}`. Use the buttons to toggle or delete it.", ephemeral=True,
            view=CommandActionView(self.db, value),
        )


class CommandActionView(discord.ui.View):
    def __init__(self, db, name: str):
        super().__init__(timeout=120)
        self.db = db
        self.name = name

    @discord.ui.button(label="Enable", style=discord.ButtonStyle.success, emoji="🟢")
    async def enable(self, interaction: discord.Interaction, button: discord.ui.Button):
        await repo.toggle_custom_command(self.db, interaction.guild_id, self.name, True)
        await interaction.response.send_message(f"`{self.name}` enabled.", ephemeral=True)

    @discord.ui.button(label="Disable", style=discord.ButtonStyle.secondary, emoji="⭕")
    async def disable(self, interaction: discord.Interaction, button: discord.ui.Button):
        await repo.toggle_custom_command(self.db, interaction.guild_id, self.name, False)
        await interaction.response.send_message(f"`{self.name}` disabled.", ephemeral=True)

    @discord.ui.button(label="Delete", style=discord.ButtonStyle.danger, emoji="🗑️")
    async def delete(self, interaction: discord.Interaction, button: discord.ui.Button):
        await repo.delete_custom_command(self.db, interaction.guild_id, self.name)
        await interaction.response.send_message(f"`{self.name}` deleted.", ephemeral=True)


class CustomCommands(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = bot.db
        self._cooldowns: dict[tuple[int, int, str], float] = {}

    @app_commands.command(name="customcommand-create", description="Create or update a custom command")
    @app_commands.describe(name="Command name (no prefix)", content="Response text",
                            as_embed="Send as an embed", role_restriction="Only this role can use it",
                            cooldown_seconds="Per-user cooldown in seconds")
    @require_admin()
    async def create(self, interaction: discord.Interaction, name: str, content: str,
                      as_embed: bool = False, role_restriction: discord.Role | None = None,
                      cooldown_seconds: app_commands.Range[int, 0, 3600] = 0):
        await repo.create_custom_command(
            self.db, interaction.guild_id, name, "embed" if as_embed else "text", content,
            role_restriction.id if role_restriction else None, cooldown_seconds,
        )
        await interaction.response.send_message(embed=success_embed("Saved", f"Custom command `{name}` is live."), ephemeral=True)

    @app_commands.command(name="customcommand-manage", description="View and manage custom commands")
    @require_admin()
    async def manage(self, interaction: discord.Interaction):
        rows = await repo.list_custom_commands(self.db, interaction.guild_id)
        await interaction.response.send_message(
            embed=panel_embed("⚙️ Custom Commands", f"{len(rows)} command(s) configured."),
            view=ManageCommandsView(self.db, [dict(r) for r in rows]),
            ephemeral=True,
        )

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return
        settings = await repo.get_guild_settings(self.db, message.guild.id)
        prefix = settings["prefix"] or "!"
        if not message.content.startswith(prefix):
            return
        name = message.content[len(prefix):].split()[0].lower() if message.content[len(prefix):].strip() else ""
        if not name:
            return
        cmd = await repo.get_custom_command(self.db, message.guild.id, name)
        if not cmd:
            return

        if cmd["role_restriction_id"]:
            role = message.guild.get_role(cmd["role_restriction_id"])
            if role and role not in message.author.roles:
                return

        key = (message.guild.id, message.author.id, name)
        now = time.time()
        if cmd["cooldown_seconds"] and now - self._cooldowns.get(key, 0) < cmd["cooldown_seconds"]:
            return
        self._cooldowns[key] = now

        content = (cmd["content"]
                   .replace("{user}", message.author.mention)
                   .replace("{server}", message.guild.name)
                   .replace("{count}", str(message.guild.member_count)))
        if cmd["response_type"] == "embed":
            await message.channel.send(embed=panel_embed(name.title(), content))
        else:
            await message.channel.send(content)


async def setup(bot: commands.Bot):
    await bot.add_cog(CustomCommands(bot))
