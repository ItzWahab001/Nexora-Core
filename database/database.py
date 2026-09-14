import asyncio
from pathlib import Path
import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS guild_settings (
 guild_id INTEGER PRIMARY KEY,
 onboarding_enabled INTEGER DEFAULT 1,
 onboarding_vc_id INTEGER,
 verification_channel_id INTEGER,
 new_member_role_id INTEGER,
 verified_role_id INTEGER,
 staff_role_id INTEGER,
 welcome_message TEXT,
 rules_text TEXT,
 onboarding_timeout INTEGER DEFAULT 300,
 onboarding_resume INTEGER DEFAULT 1,
 auto_reconnect INTEGER DEFAULT 1,
 tts_provider TEXT DEFAULT 'edge',
 tts_voice TEXT DEFAULT 'en-US-AriaNeural',
 ai_channel_id INTEGER,
 ai_cooldown INTEGER DEFAULT 5,
 music_channel_id INTEGER,
 welcome_channel_id INTEGER,
 goodbye_channel_id INTEGER,
 ticket_category_id INTEGER,
 application_channel_id INTEGER,
 log_channel_id INTEGER,
 updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS members (
 guild_id INTEGER, user_id INTEGER, joined_at TEXT, verified INTEGER DEFAULT 0,
 PRIMARY KEY(guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS onboarding_sessions (
 guild_id INTEGER, user_id INTEGER, state TEXT DEFAULT 'welcome',
 question_index INTEGER DEFAULT 0, active INTEGER DEFAULT 1, started_at TEXT,
 updated_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS verification (
 guild_id INTEGER, user_id INTEGER, verified_at TEXT,
 PRIMARY KEY(guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS tickets (
 id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id INTEGER, channel_id INTEGER,
 opener_id INTEGER, status TEXT DEFAULT 'open', claimed_by INTEGER,
 reason TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, closed_at TEXT
);
CREATE TABLE IF NOT EXISTS applications (
 id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id INTEGER, user_id INTEGER,
 status TEXT DEFAULT 'pending', answers TEXT, reviewer_id INTEGER,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS giveaways (
 id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id INTEGER, channel_id INTEGER,
 message_id INTEGER, prize TEXT, winners INTEGER DEFAULT 1, ends_at TEXT,
 requirements TEXT, status TEXT DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS giveaway_entries (
 giveaway_id INTEGER, user_id INTEGER, PRIMARY KEY(giveaway_id,user_id)
);
CREATE TABLE IF NOT EXISTS warnings (
 id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id INTEGER, user_id INTEGER,
 moderator_id INTEGER, reason TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS moderation_cases (
 id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id INTEGER, user_id INTEGER,
 moderator_id INTEGER, action TEXT, reason TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS custom_commands (
 guild_id INTEGER, name TEXT, response TEXT, role_id INTEGER, cooldown INTEGER DEFAULT 0,
 PRIMARY KEY(guild_id,name)
);
CREATE TABLE IF NOT EXISTS logs (
 id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id INTEGER, event TEXT, payload TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

class Database:
    def __init__(self, path):
        self.path = Path(path)
        self.conn = None
        self.lock = asyncio.Lock()

    async def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = await aiosqlite.connect(self.path)
        self.conn.row_factory = aiosqlite.Row
        await self.conn.executescript(SCHEMA)
        await self.conn.commit()

    async def close(self):
        if self.conn:
            await self.conn.close()

    async def execute(self, sql, params=()):
        async with self.lock:
            cur = await self.conn.execute(sql, params)
            await self.conn.commit()
            return cur

    async def fetchone(self, sql, params=()):
        async with self.lock:
            cur = await self.conn.execute(sql, params)
            return await cur.fetchone()

    async def fetchall(self, sql, params=()):
        async with self.lock:
            cur = await self.conn.execute(sql, params)
            return await cur.fetchall()
