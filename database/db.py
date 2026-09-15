"""
Async SQLite database layer (aiosqlite).

Design note: all SQL here is plain ANSI-ish SQL (TEXT/INTEGER/REAL, no
SQLite-only pragmas in the schema itself) so migrating to PostgreSQL later
is a matter of swapping the driver + placeholder style, not rewriting
queries from scratch.
"""
import aiosqlite
import asyncio
import json
import logging
import os
import time
from typing import Any, Iterable, Optional

logger = logging.getLogger("database")

SCHEMA = """
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id INTEGER PRIMARY KEY,
    prefix TEXT DEFAULT '!',
    onboarding_enabled INTEGER DEFAULT 0,
    onboarding_vc_id INTEGER,
    verification_channel_id INTEGER,
    unverified_role_id INTEGER,
    verified_role_id INTEGER,
    welcome_message TEXT DEFAULT 'Welcome {user} to {server}! You are member #{count}.',
    goodbye_message TEXT DEFAULT '{user} has left {server}. We now have {count} members.',
    server_description TEXT DEFAULT 'A great place to hang out.',
    server_rules TEXT DEFAULT 'Be respectful. No spam. Follow Discord ToS.',
    onboarding_timeout_seconds INTEGER DEFAULT 300,
    tts_provider TEXT,
    tts_voice TEXT,
    welcome_channel_id INTEGER,
    welcome_enabled INTEGER DEFAULT 0,
    goodbye_enabled INTEGER DEFAULT 0,
    welcome_embed INTEGER DEFAULT 1,
    ai_channel_id INTEGER,
    ai_enabled INTEGER DEFAULT 0,
    mod_log_channel_id INTEGER,
    ticket_category_id INTEGER,
    ticket_log_channel_id INTEGER,
    application_log_channel_id INTEGER,
    music_volume INTEGER DEFAULT 50,
    updated_at REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS members (
    guild_id INTEGER,
    user_id INTEGER,
    joined_at REAL,
    is_verified INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS onboarding_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    status TEXT DEFAULT 'in_progress',  -- in_progress, completed, timed_out, abandoned
    stage TEXT DEFAULT 'greeting',
    started_at REAL,
    updated_at REAL,
    completed_at REAL,
    UNIQUE(guild_id, user_id, channel_id, status)
);

CREATE TABLE IF NOT EXISTS verification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    verified_at REAL,
    method TEXT DEFAULT 'voice_onboarding'
);

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    channel_id INTEGER,
    user_id INTEGER NOT NULL,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'open',  -- open, claimed, closed
    claimed_by INTEGER,
    close_reason TEXT,
    created_at REAL,
    closed_at REAL
);

CREATE TABLE IF NOT EXISTS applications (
    application_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    app_type TEXT NOT NULL,
    answers TEXT,  -- JSON
    status TEXT DEFAULT 'pending',  -- pending, accepted, denied
    reviewer_id INTEGER,
    reviewed_at REAL,
    submitted_at REAL
);

CREATE TABLE IF NOT EXISTS application_types (
    guild_id INTEGER,
    app_type TEXT,
    questions TEXT,  -- JSON list of strings
    enabled INTEGER DEFAULT 1,
    PRIMARY KEY (guild_id, app_type)
);

CREATE TABLE IF NOT EXISTS giveaways (
    giveaway_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    message_id INTEGER,
    prize TEXT NOT NULL,
    winner_count INTEGER DEFAULT 1,
    host_id INTEGER,
    ends_at REAL,
    status TEXT DEFAULT 'active',  -- active, ended, cancelled
    requirement_role_id INTEGER,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
    giveaway_id INTEGER,
    user_id INTEGER,
    entered_at REAL,
    PRIMARY KEY (giveaway_id, user_id)
);

CREATE TABLE IF NOT EXISTS warnings (
    warning_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    moderator_id INTEGER NOT NULL,
    reason TEXT,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS moderation_cases (
    case_id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    moderator_id INTEGER NOT NULL,
    action TEXT NOT NULL,  -- ban, kick, timeout, warn, unban
    reason TEXT,
    duration_seconds INTEGER,
    created_at REAL
);

CREATE TABLE IF NOT EXISTS custom_commands (
    guild_id INTEGER,
    name TEXT,
    response_type TEXT DEFAULT 'text',  -- text, embed
    content TEXT,
    role_restriction_id INTEGER,
    cooldown_seconds INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at REAL,
    PRIMARY KEY (guild_id, name)
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER,
    category TEXT,
    message TEXT,
    created_at REAL
);
"""


class Database:
    def __init__(self, path: str):
        self.path = path
        self._conn: Optional[aiosqlite.Connection] = None
        self._lock = asyncio.Lock()

    async def connect(self):
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        self._conn = await aiosqlite.connect(self.path)
        self._conn.row_factory = aiosqlite.Row
        await self._conn.execute("PRAGMA foreign_keys = ON;")
        await self._conn.execute("PRAGMA journal_mode = WAL;")
        await self._conn.executescript(SCHEMA)
        await self._conn.commit()
        logger.info(f"Database connected at {self.path}")

    async def close(self):
        if self._conn:
            await self._conn.close()

    async def execute(self, query: str, params: Iterable[Any] = ()) -> int:
        async with self._lock:
            cur = await self._conn.execute(query, tuple(params))
            await self._conn.commit()
            return cur.lastrowid

    async def fetchone(self, query: str, params: Iterable[Any] = ()) -> Optional[aiosqlite.Row]:
        async with self._lock:
            cur = await self._conn.execute(query, tuple(params))
            return await cur.fetchone()

    async def fetchall(self, query: str, params: Iterable[Any] = ()) -> list[aiosqlite.Row]:
        async with self._lock:
            cur = await self._conn.execute(query, tuple(params))
            return await cur.fetchall()

    async def log(self, guild_id: Optional[int], category: str, message: str):
        try:
            await self.execute(
                "INSERT INTO logs (guild_id, category, message, created_at) VALUES (?, ?, ?, ?)",
                (guild_id, category, message, time.time()),
            )
        except Exception:
            logger.exception("Failed writing to logs table")


def dumps(obj: Any) -> str:
    return json.dumps(obj)


def loads(text: Optional[str], default: Any = None) -> Any:
    if not text:
        return default
    try:
        return json.loads(text)
    except Exception:
        return default
