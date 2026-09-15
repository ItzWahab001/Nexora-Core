import discord


class MusicControlView(discord.ui.View):
    """Sent with the Now Playing embed. Talks back to the Music cog."""

    def __init__(self, bot: discord.Client, guild_id: int):
        super().__init__(timeout=None)
        self.bot = bot
        self.guild_id = guild_id

    def _cog(self):
        return self.bot.get_cog("Music")

    @discord.ui.button(emoji="⏸️", style=discord.ButtonStyle.secondary, custom_id="music:pause")
    async def pause(self, interaction: discord.Interaction, button: discord.ui.Button):
        ok = await self._cog().pause(interaction.guild)
        await interaction.response.send_message("Paused." if ok else "Nothing is playing.", ephemeral=True)

    @discord.ui.button(emoji="▶️", style=discord.ButtonStyle.secondary, custom_id="music:resume")
    async def resume(self, interaction: discord.Interaction, button: discord.ui.Button):
        ok = await self._cog().resume(interaction.guild)
        await interaction.response.send_message("Resumed." if ok else "Nothing is paused.", ephemeral=True)

    @discord.ui.button(emoji="⏭️", style=discord.ButtonStyle.secondary, custom_id="music:skip")
    async def skip(self, interaction: discord.Interaction, button: discord.ui.Button):
        ok = await self._cog().skip(interaction.guild)
        await interaction.response.send_message("Skipped." if ok else "Nothing to skip.", ephemeral=True)

    @discord.ui.button(emoji="⏹️", style=discord.ButtonStyle.danger, custom_id="music:stop")
    async def stop(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._cog().stop(interaction.guild)
        await interaction.response.send_message("Stopped and cleared the queue.", ephemeral=True)

    @discord.ui.button(emoji="🔁", style=discord.ButtonStyle.secondary, custom_id="music:loop")
    async def loop(self, interaction: discord.Interaction, button: discord.ui.Button):
        state = await self._cog().toggle_loop(interaction.guild)
        await interaction.response.send_message(f"Loop {'enabled' if state else 'disabled'}.", ephemeral=True)

    @discord.ui.button(label="Queue", emoji="📜", style=discord.ButtonStyle.primary, custom_id="music:queue")
    async def queue(self, interaction: discord.Interaction, button: discord.ui.Button):
        text = self._cog().queue_text(interaction.guild)
        await interaction.response.send_message(text, ephemeral=True)
