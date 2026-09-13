"""
Async SQLite data-access layer.

A single `Database` instance is created in main.py, connected once on
startup, and attached to the bot as `bot.db`. Every cog reaches persistent
storage through this class instead of touching aiosqlite directly, so:

  - all SQL lives in one place and is easy to audit for injection safety
    (every query below uses parameterized placeholders, never string
    interpolation of user input),
  - the connection / migrations lifecycle is handled once, and
  - swapping SQLite for another backend later only requires changing this
    file.
"""

from __future__ import annotations

import datetime as dt
import os
from typing import Any, Iterable

import aiosqlite

from config import config
from database.migrations import run_migrations
from utils.logger import logger


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


class Database:
    def __init__(self, path: str | None = None) -> None:
        self.path = path or config.database_path
        self._conn: aiosqlite.Connection | None = None

    # ------------------------------------------------------------- lifecycle
    async def connect(self) -> None:
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        self._conn = await aiosqlite.connect(self.path)
        await self._conn.execute("PRAGMA foreign_keys = ON")
        await self._conn.execute("PRAGMA journal_mode = WAL")
        await run_migrations(self._conn)
        logger.info("Connected to database at %s", self.path)

    async def close(self) -> None:
        if self._conn:
            await self._conn.close()
            logger.info("Database connection closed.")

    @property
    def conn(self) -> aiosqlite.Connection:
        if self._conn is None:
            raise RuntimeError("Database.connect() must be called before use.")
        return self._conn

    # ---------------------------------------------------------------- core
    async def execute(self, query: str, params: Iterable[Any] = ()) -> None:
        await self.conn.execute(query, params)
        await self.conn.commit()

    async def fetchone(self, query: str, params: Iterable[Any] = ()) -> aiosqlite.Row | None:
        self.conn.row_factory = aiosqlite.Row
        cursor = await self.conn.execute(query, params)
        row = await cursor.fetchone()
        await cursor.close()
        return row

    async def fetchall(self, query: str, params: Iterable[Any] = ()) -> list[aiosqlite.Row]:
        self.conn.row_factory = aiosqlite.Row
        cursor = await self.conn.execute(query, params)
        rows = await cursor.fetchall()
        await cursor.close()
        return list(rows)

    async def execute_returning_id(self, query: str, params: Iterable[Any] = ()) -> int:
        cursor = await self.conn.execute(query, params)
        await self.conn.commit()
        return cursor.lastrowid  # type: ignore[return-value]

    # =============================================================== TICKETS
    async def get_ticket_config(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone("SELECT * FROM ticket_config WHERE guild_id = ?", (guild_id,))

    async def upsert_ticket_config(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("ticket_config", "guild_id", guild_id, fields)

    async def create_ticket_panel(self, guild_id: int, channel_id: int) -> int:
        return await self.execute_returning_id(
            "INSERT INTO ticket_panels (guild_id, channel_id) VALUES (?, ?)",
            (guild_id, channel_id),
        )

    async def set_panel_message(self, panel_id: int, message_id: int) -> None:
        await self.execute(
            "UPDATE ticket_panels SET message_id = ? WHERE panel_id = ?", (message_id, panel_id)
        )

    async def add_ticket_category(
        self, panel_id: int, guild_id: int, label: str, emoji: str | None, support_role_id: int | None
    ) -> None:
        await self.execute(
            "INSERT INTO ticket_categories (panel_id, guild_id, label, emoji, support_role_id) "
            "VALUES (?, ?, ?, ?, ?)",
            (panel_id, guild_id, label, emoji, support_role_id),
        )

    async def get_panel_categories(self, panel_id: int) -> list[aiosqlite.Row]:
        return await self.fetchall(
            "SELECT * FROM ticket_categories WHERE panel_id = ?", (panel_id,)
        )

    async def get_panel(self, panel_id: int) -> aiosqlite.Row | None:
        return await self.fetchone("SELECT * FROM ticket_panels WHERE panel_id = ?", (panel_id,))

    async def create_ticket(
        self, guild_id: int, channel_id: int, owner_id: int, category_label: str | None
    ) -> int:
        return await self.execute_returning_id(
            "INSERT INTO tickets (guild_id, channel_id, owner_id, category_label, status, created_at) "
            "VALUES (?, ?, ?, ?, 'open', ?)",
            (guild_id, channel_id, owner_id, category_label, _now()),
        )

    async def get_ticket_by_channel(self, channel_id: int) -> aiosqlite.Row | None:
        return await self.fetchone("SELECT * FROM tickets WHERE channel_id = ?", (channel_id,))

    async def claim_ticket(self, channel_id: int, claimer_id: int) -> None:
        await self.execute(
            "UPDATE tickets SET claimed_by = ? WHERE channel_id = ?", (claimer_id, channel_id)
        )

    async def close_ticket(self, channel_id: int) -> None:
        await self.execute(
            "UPDATE tickets SET status = 'closed', closed_at = ? WHERE channel_id = ?",
            (_now(), channel_id),
        )

    async def open_tickets_for_guild(self, guild_id: int) -> list[aiosqlite.Row]:
        return await self.fetchall(
            "SELECT * FROM tickets WHERE guild_id = ? AND status = 'open'", (guild_id,)
        )

    async def user_open_ticket(self, guild_id: int, owner_id: int) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM tickets WHERE guild_id = ? AND owner_id = ? AND status = 'open'",
            (guild_id, owner_id),
        )

    # ============================================================= GIVEAWAYS
    async def create_giveaway(
        self,
        guild_id: int,
        channel_id: int,
        prize: str,
        winners_count: int,
        host_id: int,
        requirement: str | None,
        end_time: dt.datetime,
    ) -> int:
        return await self.execute_returning_id(
            "INSERT INTO giveaways (guild_id, channel_id, prize, winners_count, host_id, "
            "requirement, end_time, ended, cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)",
            (guild_id, channel_id, prize, winners_count, host_id, requirement, end_time.isoformat()),
        )

    async def set_giveaway_message(self, giveaway_id: int, message_id: int) -> None:
        await self.execute(
            "UPDATE giveaways SET message_id = ? WHERE giveaway_id = ?", (message_id, giveaway_id)
        )

    async def get_giveaway(self, giveaway_id: int) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM giveaways WHERE giveaway_id = ?", (giveaway_id,)
        )

    async def get_giveaway_by_message(self, message_id: int) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM giveaways WHERE message_id = ?", (message_id,)
        )

    async def active_giveaways(self, guild_id: int | None = None) -> list[aiosqlite.Row]:
        if guild_id is None:
            return await self.fetchall(
                "SELECT * FROM giveaways WHERE ended = 0 AND cancelled = 0"
            )
        return await self.fetchall(
            "SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 AND cancelled = 0",
            (guild_id,),
        )

    async def add_giveaway_entry(self, giveaway_id: int, user_id: int) -> bool:
        try:
            await self.execute(
                "INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)",
                (giveaway_id, user_id),
            )
            return True
        except aiosqlite.IntegrityError:
            return False  # already entered

    async def giveaway_entry_count(self, giveaway_id: int) -> int:
        row = await self.fetchone(
            "SELECT COUNT(*) AS c FROM giveaway_entries WHERE giveaway_id = ?", (giveaway_id,)
        )
        return row["c"] if row else 0

    async def giveaway_entrants(self, giveaway_id: int) -> list[int]:
        rows = await self.fetchall(
            "SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?", (giveaway_id,)
        )
        return [r["user_id"] for r in rows]

    async def mark_giveaway_ended(self, giveaway_id: int) -> None:
        await self.execute(
            "UPDATE giveaways SET ended = 1 WHERE giveaway_id = ?", (giveaway_id,)
        )

    async def mark_giveaway_cancelled(self, giveaway_id: int) -> None:
        await self.execute(
            "UPDATE giveaways SET cancelled = 1, ended = 1 WHERE giveaway_id = ?", (giveaway_id,)
        )

    # ============================================================ MODERATION
    async def add_warning(self, guild_id: int, user_id: int, moderator_id: int, reason: str, source: str = "manual") -> int:
        return await self.execute_returning_id(
            "INSERT INTO warnings (guild_id, user_id, moderator_id, reason, source, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (guild_id, user_id, moderator_id, reason, source, _now()),
        )

    async def get_warnings(self, guild_id: int, user_id: int) -> list[aiosqlite.Row]:
        return await self.fetchall(
            "SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC",
            (guild_id, user_id),
        )

    async def clear_warnings(self, guild_id: int, user_id: int) -> None:
        await self.execute(
            "DELETE FROM warnings WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
        )

    async def get_guild_config(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone("SELECT * FROM guild_config WHERE guild_id = ?", (guild_id,))

    async def upsert_guild_config(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("guild_config", "guild_id", guild_id, fields)

    # -------------------------------------------------------------- welcome
    async def get_welcome_settings(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM welcome_settings WHERE guild_id = ?", (guild_id,)
        )

    async def upsert_welcome_settings(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("welcome_settings", "guild_id", guild_id, fields)

    async def get_goodbye_settings(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM goodbye_settings WHERE guild_id = ?", (guild_id,)
        )

    async def upsert_goodbye_settings(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("goodbye_settings", "guild_id", guild_id, fields)

    # ------------------------------------------------------------- autorole
    async def add_autorole(self, guild_id: int, role_id: int) -> None:
        await self.execute(
            "INSERT OR IGNORE INTO autoroles (guild_id, role_id) VALUES (?, ?)",
            (guild_id, role_id),
        )

    async def remove_autorole(self, guild_id: int, role_id: int) -> None:
        await self.execute(
            "DELETE FROM autoroles WHERE guild_id = ? AND role_id = ?", (guild_id, role_id)
        )

    async def get_autoroles(self, guild_id: int) -> list[int]:
        rows = await self.fetchall("SELECT role_id FROM autoroles WHERE guild_id = ?", (guild_id,))
        return [r["role_id"] for r in rows]

    # --------------------------------------------------------- verification
    async def get_verification_settings(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM verification_settings WHERE guild_id = ?", (guild_id,)
        )

    async def upsert_verification_settings(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("verification_settings", "guild_id", guild_id, fields)

    async def is_verified(self, guild_id: int, user_id: int) -> bool:
        row = await self.fetchone(
            "SELECT 1 FROM verified_users WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
        )
        return row is not None

    async def mark_verified(self, guild_id: int, user_id: int) -> None:
        await self.execute(
            "INSERT OR IGNORE INTO verified_users (guild_id, user_id, verified_at) VALUES (?, ?, ?)",
            (guild_id, user_id, _now()),
        )

    # -------------------------------------------------------------automod
    async def get_automod_settings(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM automod_settings WHERE guild_id = ?", (guild_id,)
        )

    async def upsert_automod_settings(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("automod_settings", "guild_id", guild_id, fields)

    # --------------------------------------------------------- custom cmds
    async def add_custom_command(self, guild_id: int, name: str, response: str, created_by: int) -> None:
        await self.execute(
            "INSERT INTO custom_commands (guild_id, name, response, enabled, created_by) "
            "VALUES (?, ?, ?, 1, ?) "
            "ON CONFLICT(guild_id, name) DO UPDATE SET response = excluded.response, enabled = 1",
            (guild_id, name.lower(), response, created_by),
        )

    async def delete_custom_command(self, guild_id: int, name: str) -> None:
        await self.execute(
            "DELETE FROM custom_commands WHERE guild_id = ? AND name = ?", (guild_id, name.lower())
        )

    async def get_custom_command(self, guild_id: int, name: str) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?",
            (guild_id, name.lower()),
        )

    async def list_custom_commands(self, guild_id: int) -> list[aiosqlite.Row]:
        return await self.fetchall(
            "SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY name", (guild_id,)
        )

    async def set_custom_command_enabled(self, guild_id: int, name: str, enabled: bool) -> None:
        await self.execute(
            "UPDATE custom_commands SET enabled = ? WHERE guild_id = ? AND name = ?",
            (1 if enabled else 0, guild_id, name.lower()),
        )

    # ------------------------------------------------------------- logging
    async def get_logging_settings(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone(
            "SELECT * FROM logging_settings WHERE guild_id = ?", (guild_id,)
        )

    async def upsert_logging_settings(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("logging_settings", "guild_id", guild_id, fields)

    # ------------------------------------------------------------------ ai
    async def get_ai_settings(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone("SELECT * FROM ai_settings WHERE guild_id = ?", (guild_id,))

    async def upsert_ai_settings(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("ai_settings", "guild_id", guild_id, fields)

    async def add_ai_message(self, guild_id: int, user_id: int, role: str, content: str) -> None:
        await self.execute(
            "INSERT INTO ai_conversations (guild_id, user_id, role, content, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (guild_id, user_id, role, content, _now()),
        )
        # Keep only the most recent 20 messages per user to bound context size / DB growth.
        await self.execute(
            "DELETE FROM ai_conversations WHERE id IN ("
            "  SELECT id FROM ai_conversations WHERE guild_id = ? AND user_id = ? "
            "  ORDER BY id DESC LIMIT -1 OFFSET 20)",
            (guild_id, user_id),
        )

    async def get_ai_history(self, guild_id: int, user_id: int) -> list[aiosqlite.Row]:
        return await self.fetchall(
            "SELECT role, content FROM ai_conversations WHERE guild_id = ? AND user_id = ? "
            "ORDER BY id ASC",
            (guild_id, user_id),
        )

    async def reset_ai_history(self, guild_id: int, user_id: int) -> None:
        await self.execute(
            "DELETE FROM ai_conversations WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
        )

    # --------------------------------------------------------------- music
    async def get_music_settings(self, guild_id: int) -> aiosqlite.Row | None:
        return await self.fetchone("SELECT * FROM music_settings WHERE guild_id = ?", (guild_id,))

    async def upsert_music_settings(self, guild_id: int, **fields: Any) -> None:
        await self._upsert("music_settings", "guild_id", guild_id, fields)

    # ------------------------------------------------------------- internal
    async def _upsert(self, table: str, key_col: str, key_val: Any, fields: dict[str, Any]) -> None:
        """
        Generic INSERT ... ON CONFLICT UPDATE helper for single-primary-key
        settings tables. `fields` values are always bound as parameters, so
        this is safe against SQL injection even though column *names* are
        f-string interpolated (column names are never user input -- they're
        hardcoded kwargs passed by our own cogs).
        """
        if not fields:
            await self.execute(
                f"INSERT OR IGNORE INTO {table} ({key_col}) VALUES (?)", (key_val,)
            )
            return
        columns = [key_col, *fields.keys()]
        placeholders = ", ".join("?" for _ in columns)
        updates = ", ".join(f"{col} = excluded.{col}" for col in fields.keys())
        values = [key_val, *fields.values()]
        query = (
            f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders}) "
            f"ON CONFLICT({key_col}) DO UPDATE SET {updates}"
        )
        await self.execute(query, values)
