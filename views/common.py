"""
Shared View building blocks: the base panel view (Home/Back/Close row) and
small helpers so every feature panel in views/ looks and behaves the same
way. Feature-specific panels subclass `PanelView` and add their own buttons
above the nav row.
"""

from __future__ import annotations

from typing import Optional

import discord

from utils.embeds import error_embed

PANEL_TIMEOUT = 180


class PanelView(discord.ui.View):
    """
    Base class for every dedicated feature panel.

    Subclasses call `self.add_nav_row()` at the end of __init__ (after
    adding their own buttons) so Home/Back/Close always render last.
    `parent_builder` is a zero-arg callable returning (embed, view) for the
    "Back" target -- usually the main menu, but panels can chain (e.g. a
    "configure category" sub-panel going Back to the ticket panel).
    """

    def __init__(
        self,
        *,
        author_id: int,
        parent_builder=None,
        timeout: float = PANEL_TIMEOUT,
    ) -> None:
        super().__init__(timeout=timeout)
        self.author_id = author_id
        self.parent_builder = parent_builder
        self.message: Optional[discord.Message] = None

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                embed=error_embed("Not For You", "Only the person who opened this menu can use it."),
                ephemeral=True,
            )
            return False
        return True

    async def on_timeout(self) -> None:
        for item in self.children:
            item.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except discord.HTTPException:
                pass

    def add_nav_row(self, *, show_back: bool = True) -> None:
        self.add_item(HomeButton())
        if show_back and self.parent_builder is not None:
            self.add_item(BackButton())
        self.add_item(CloseButton())


class HomeButton(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Home", emoji="🏠", style=discord.ButtonStyle.secondary, row=4)

    async def callback(self, interaction: discord.Interaction) -> None:
        from views.main_menu import build_main_menu

        embed, view = build_main_menu(interaction.user.id)
        await interaction.response.edit_message(embed=embed, view=view)
        view.message = interaction.message


class BackButton(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Back", emoji="⬅️", style=discord.ButtonStyle.secondary, row=4)

    async def callback(self, interaction: discord.Interaction) -> None:
        view: PanelView = self.view  # type: ignore[assignment]
        if view.parent_builder is None:
            return
        embed, new_view = view.parent_builder()
        await interaction.response.edit_message(embed=embed, view=new_view)
        new_view.message = interaction.message


class CloseButton(discord.ui.Button):
    def __init__(self) -> None:
        super().__init__(label="Close", emoji="❌", style=discord.ButtonStyle.danger, row=4)

    async def callback(self, interaction: discord.Interaction) -> None:
        await interaction.response.edit_message(
            content="Menu closed.", embed=None, view=None
        )


def disable_all(view: discord.ui.View) -> None:
    for item in view.children:
        item.disabled = True
