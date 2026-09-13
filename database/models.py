"""
Raw SQL schema definitions (SQLite). Kept separate from database.py so the
schema is easy to read/diff on its own, and so migrations.py can reference
CURRENT_SCHEMA_VERSION without importing the connection-handling code.

Design note: we use one table per feature domain instead of one giant
"settings" blob table. It's more verbose but keeps each cog's queries
simple, typed, and independent of every other feature -- exactly what the
"add features later without rewriting the bot" requirement calls for.
"""

from __future__ import annotations

CURRENT_SCHEMA_VERSION = 1

SCHEMA_STATEMENTS: list[str] = [
    # ---------------------------------------------------------------- core
    """
    CREATE TABLE IF NOT EXISTS guild_config (
        guild_id INTEGER PRIMARY KEY,
        mod_log_channel_id INTEGER,
        mute_role_id INTEGER
    )
    """,
    # ------------------------------------------------------------- tickets
    """
    CREATE TABLE IF NOT EXISTS ticket_config (
        guild_id INTEGER PRIMARY KEY,
        category_channel_id INTEGER,
        log_channel_id INTEGER,
        transcript_channel_id INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS ticket_panels (
        panel_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        channel_id INTEGER NOT NULL,
        message_id INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS ticket_categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        panel_id INTEGER NOT NULL,
        guild_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        emoji TEXT,
        support_role_id INTEGER,
        FOREIGN KEY(panel_id) REFERENCES ticket_panels(panel_id) ON DELETE CASCADE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tickets (
        ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        channel_id INTEGER NOT NULL UNIQUE,
        owner_id INTEGER NOT NULL,
        category_label TEXT,
        claimed_by INTEGER,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL,
        closed_at TEXT
    )
    """,
    # ------------------------------------------------------------ giveaways
    """
    CREATE TABLE IF NOT EXISTS giveaways (
        giveaway_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        channel_id INTEGER NOT NULL,
        message_id INTEGER,
        prize TEXT NOT NULL,
        winners_count INTEGER NOT NULL DEFAULT 1,
        host_id INTEGER NOT NULL,
        requirement TEXT,
        end_time TEXT NOT NULL,
        ended INTEGER NOT NULL DEFAULT 0,
        cancelled INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS giveaway_entries (
        giveaway_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (giveaway_id, user_id),
        FOREIGN KEY(giveaway_id) REFERENCES giveaways(giveaway_id) ON DELETE CASCADE
    )
    """,
    # ---------------------------------------------------------- moderation
    """
    CREATE TABLE IF NOT EXISTS warnings (
        warning_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        moderator_id INTEGER NOT NULL,
        reason TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL
    )
    """,
    # ------------------------------------------------------------- welcome
    """
    CREATE TABLE IF NOT EXISTS welcome_settings (
        guild_id INTEGER PRIMARY KEY,
        channel_id INTEGER,
        message TEXT DEFAULT 'Welcome {user} to **{server}**! You are member #{member_count}.',
        enabled INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS goodbye_settings (
        guild_id INTEGER PRIMARY KEY,
        channel_id INTEGER,
        message TEXT DEFAULT '{username} has left **{server}**. We now have {member_count} members.',
        enabled INTEGER NOT NULL DEFAULT 0
    )
    """,
    # ------------------------------------------------------------ autorole
    """
    CREATE TABLE IF NOT EXISTS autoroles (
        guild_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        PRIMARY KEY (guild_id, role_id)
    )
    """,
    # -------------------------------------------------------- verification
    """
    CREATE TABLE IF NOT EXISTS verification_settings (
        guild_id INTEGER PRIMARY KEY,
        channel_id INTEGER,
        message_id INTEGER,
        verified_role_id INTEGER,
        unverified_role_id INTEGER,
        enabled INTEGER NOT NULL DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS verified_users (
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        verified_at TEXT NOT NULL,
        PRIMARY KEY (guild_id, user_id)
    )
    """,
    # -------------------------------------------------------------automod
    """
    CREATE TABLE IF NOT EXISTS automod_settings (
        guild_id INTEGER PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 0,
        anti_spam INTEGER NOT NULL DEFAULT 1,
        anti_invite INTEGER NOT NULL DEFAULT 1,
        anti_link INTEGER NOT NULL DEFAULT 0,
        word_filter INTEGER NOT NULL DEFAULT 1,
        mention_spam INTEGER NOT NULL DEFAULT 1,
        mention_limit INTEGER NOT NULL DEFAULT 5,
        spam_message_limit INTEGER NOT NULL DEFAULT 5,
        spam_interval_seconds INTEGER NOT NULL DEFAULT 5,
        punishment TEXT NOT NULL DEFAULT 'timeout',
        banned_words TEXT NOT NULL DEFAULT ''
    )
    """,
    # -------------------------------------------------------- custom cmds
    """
    CREATE TABLE IF NOT EXISTS custom_commands (
        guild_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        response TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER,
        PRIMARY KEY (guild_id, name)
    )
    """,
    # ------------------------------------------------------------- logging
    """
    CREATE TABLE IF NOT EXISTS logging_settings (
        guild_id INTEGER PRIMARY KEY,
        log_channel_id INTEGER,
        enabled INTEGER NOT NULL DEFAULT 0,
        events TEXT NOT NULL DEFAULT 'member_join,member_leave,message_delete,message_edit,ban,kick,timeout,warning,role_update,channel_update,ticket,giveaway,verification,config'
    )
    """,
    # ------------------------------------------------------------------ ai
    """
    CREATE TABLE IF NOT EXISTS ai_settings (
        guild_id INTEGER PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 0,
        channel_id INTEGER,
        system_prompt TEXT DEFAULT 'You are a helpful, concise assistant inside a Discord server.'
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS ai_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """,
    # --------------------------------------------------------------- music
    """
    CREATE TABLE IF NOT EXISTS music_settings (
        guild_id INTEGER PRIMARY KEY,
        default_volume INTEGER NOT NULL DEFAULT 50
    )
    """,
    # ------------------------------------------------------------- indexes
    "CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id)",
    "CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id)",
    "CREATE INDEX IF NOT EXISTS idx_ai_conv_guild_user ON ai_conversations(guild_id, user_id)",
]
