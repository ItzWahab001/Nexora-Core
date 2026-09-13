"""
Minimal schema-versioning system using SQLite's built-in PRAGMA user_version.

On startup, database.Database.connect() calls run_migrations(), which applies
SCHEMA_STATEMENTS (idempotent CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT
EXISTS) and then stamps the DB with CURRENT_SCHEMA_VERSION. Future breaking
schema changes should append a numbered migration function to MIGRATIONS
below rather than editing old statements in place.
"""

from __future__ import annotations

import logging
from typing import Awaitable, Callable

import aiosqlite

from database.models import CURRENT_SCHEMA_VERSION, SCHEMA_STATEMENTS

log = logging.getLogger("bot.database.migrations")

Migration = Callable[[aiosqlite.Connection], Awaitable[None]]

# Ordered list of (target_version, migration_fn) for changes that can't be
# expressed as a plain "IF NOT EXISTS" statement (column renames, data
# backfills, etc). Empty for schema v1 since it's the initial release.
MIGRATIONS: list[tuple[int, Migration]] = []


async def run_migrations(conn: aiosqlite.Connection) -> None:
    # Base schema is always safe to (re)apply.
    for statement in SCHEMA_STATEMENTS:
        await conn.execute(statement)
    await conn.commit()

    cursor = await conn.execute("PRAGMA user_version")
    row = await cursor.fetchone()
    current_version = row[0] if row else 0

    for target_version, migration_fn in MIGRATIONS:
        if current_version < target_version:
            log.info("Applying migration -> v%s", target_version)
            await migration_fn(conn)
            await conn.execute(f"PRAGMA user_version = {target_version}")
            await conn.commit()
            current_version = target_version

    if current_version < CURRENT_SCHEMA_VERSION:
        await conn.execute(f"PRAGMA user_version = {CURRENT_SCHEMA_VERSION}")
        await conn.commit()

    log.info("Database schema up to date (v%s)", CURRENT_SCHEMA_VERSION)
