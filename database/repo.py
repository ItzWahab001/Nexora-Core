"""
Repository functions — one section per domain. Cogs/views call these
instead of writing raw SQL, keeping query logic in one auditable place.
"""
import time
from typing import Any, Optional

from database.db import Database, dumps, loads

DEFAULT_WELCOME = "Welcome {user} to {server}! You are member #{count}."
DEFAULT_GOODBYE = "{user} has left {server}. We now have {count} members."
DEFAULT_DESCRIPTION = "A great place to hang out."
DEFAULT_RULES = "Be respectful. No spam. Follow Discord ToS."


# ───────────────────────── Guild Settings ─────────────────────────

async def get_guild_settings(db: Database, guild_id: int) -> dict[str, Any]:
    row = await db.fetchone("SELECT * FROM guild_settings WHERE guild_id = ?", (guild_id,))
    if row is None:
        await db.execute(
            "INSERT INTO guild_settings (guild_id, updated_at) VALUES (?, ?)",
            (guild_id, time.time()),
        )
        row = await db.fetchone("SELECT * FROM guild_settings WHERE guild_id = ?", (guild_id,))
    return dict(row)


async def update_guild_settings(db: Database, guild_id: int, **fields: Any):
    await get_guild_settings(db, guild_id)  # ensure row exists
    if not fields:
        return
    fields["updated_at"] = time.time()
    cols = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [guild_id]
    await db.execute(f"UPDATE guild_settings SET {cols} WHERE guild_id = ?", values)


# ───────────────────────── Members ─────────────────────────

async def ensure_member(db: Database, guild_id: int, user_id: int):
    row = await db.fetchone(
        "SELECT 1 FROM members WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)
    )
    if row is None:
        await db.execute(
            "INSERT INTO members (guild_id, user_id, joined_at) VALUES (?, ?, ?)",
            (guild_id, user_id, time.time()),
        )


async def set_verified(db: Database, guild_id: int, user_id: int, verified: bool = True):
    await ensure_member(db, guild_id, user_id)
    await db.execute(
        "UPDATE members SET is_verified = ? WHERE guild_id = ? AND user_id = ?",
        (1 if verified else 0, guild_id, user_id),
    )


async def is_verified(db: Database, guild_id: int, user_id: int) -> bool:
    row = await db.fetchone(
        "SELECT is_verified FROM members WHERE guild_id = ? AND user_id = ?",
        (guild_id, user_id),
    )
    return bool(row and row["is_verified"])


async def log_verification(db: Database, guild_id: int, user_id: int, method: str = "voice_onboarding"):
    await db.execute(
        "INSERT INTO verification_log (guild_id, user_id, verified_at, method) VALUES (?, ?, ?, ?)",
        (guild_id, user_id, time.time(), method),
    )


# ───────────────────────── Onboarding sessions ─────────────────────────

async def get_active_session(db: Database, guild_id: int, user_id: int):
    return await db.fetchone(
        "SELECT * FROM onboarding_sessions WHERE guild_id=? AND user_id=? AND status='in_progress'",
        (guild_id, user_id),
    )


async def create_session(db: Database, guild_id: int, user_id: int, channel_id: int) -> int:
    existing = await get_active_session(db, guild_id, user_id)
    if existing:
        return existing["session_id"]
    now = time.time()
    return await db.execute(
        """INSERT INTO onboarding_sessions
           (guild_id, user_id, channel_id, status, stage, started_at, updated_at)
           VALUES (?, ?, ?, 'in_progress', 'greeting', ?, ?)""",
        (guild_id, user_id, channel_id, now, now),
    )


async def update_session_stage(db: Database, session_id: int, stage: str):
    await db.execute(
        "UPDATE onboarding_sessions SET stage=?, updated_at=? WHERE session_id=?",
        (stage, time.time(), session_id),
    )


async def complete_session(db: Database, session_id: int, status: str = "completed"):
    await db.execute(
        "UPDATE onboarding_sessions SET status=?, completed_at=?, updated_at=? WHERE session_id=?",
        (status, time.time(), time.time(), session_id),
    )


async def get_all_in_progress_sessions(db: Database, guild_id: Optional[int] = None):
    if guild_id:
        return await db.fetchall(
            "SELECT * FROM onboarding_sessions WHERE status='in_progress' AND guild_id=?",
            (guild_id,),
        )
    return await db.fetchall("SELECT * FROM onboarding_sessions WHERE status='in_progress'")


# ───────────────────────── Tickets ─────────────────────────

async def create_ticket(db: Database, guild_id: int, user_id: int, category: str = "general") -> int:
    return await db.execute(
        """INSERT INTO tickets (guild_id, user_id, category, status, created_at)
           VALUES (?, ?, ?, 'open', ?)""",
        (guild_id, user_id, category, time.time()),
    )


async def set_ticket_channel(db: Database, ticket_id: int, channel_id: int):
    await db.execute("UPDATE tickets SET channel_id=? WHERE ticket_id=?", (channel_id, ticket_id))


async def get_ticket_by_channel(db: Database, channel_id: int):
    return await db.fetchone("SELECT * FROM tickets WHERE channel_id=?", (channel_id,))


async def claim_ticket(db: Database, ticket_id: int, staff_id: int):
    await db.execute(
        "UPDATE tickets SET status='claimed', claimed_by=? WHERE ticket_id=?", (staff_id, ticket_id)
    )


async def close_ticket(db: Database, ticket_id: int, reason: Optional[str] = None):
    await db.execute(
        "UPDATE tickets SET status='closed', close_reason=?, closed_at=? WHERE ticket_id=?",
        (reason, time.time(), ticket_id),
    )


async def count_open_tickets(db: Database, guild_id: int) -> int:
    row = await db.fetchone(
        "SELECT COUNT(*) c FROM tickets WHERE guild_id=? AND status != 'closed'", (guild_id,)
    )
    return row["c"] if row else 0


# ───────────────────────── Applications ─────────────────────────

async def set_application_type(db: Database, guild_id: int, app_type: str, questions: list[str]):
    await db.execute(
        """INSERT INTO application_types (guild_id, app_type, questions, enabled)
           VALUES (?, ?, ?, 1)
           ON CONFLICT(guild_id, app_type) DO UPDATE SET questions=excluded.questions, enabled=1""",
        (guild_id, app_type, dumps(questions)),
    )


async def get_application_types(db: Database, guild_id: int):
    return await db.fetchall(
        "SELECT * FROM application_types WHERE guild_id=? AND enabled=1", (guild_id,)
    )


async def submit_application(db: Database, guild_id: int, user_id: int, app_type: str, answers: dict) -> int:
    return await db.execute(
        """INSERT INTO applications (guild_id, user_id, app_type, answers, status, submitted_at)
           VALUES (?, ?, ?, ?, 'pending', ?)""",
        (guild_id, user_id, app_type, dumps(answers), time.time()),
    )


async def review_application(db: Database, application_id: int, reviewer_id: int, status: str):
    await db.execute(
        "UPDATE applications SET status=?, reviewer_id=?, reviewed_at=? WHERE application_id=?",
        (status, reviewer_id, time.time(), application_id),
    )


async def get_application(db: Database, application_id: int):
    return await db.fetchone("SELECT * FROM applications WHERE application_id=?", (application_id,))


# ───────────────────────── Giveaways ─────────────────────────

async def create_giveaway(db: Database, guild_id: int, channel_id: int, prize: str,
                           winner_count: int, host_id: int, ends_at: float,
                           requirement_role_id: Optional[int] = None) -> int:
    return await db.execute(
        """INSERT INTO giveaways (guild_id, channel_id, prize, winner_count, host_id,
           ends_at, status, requirement_role_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)""",
        (guild_id, channel_id, prize, winner_count, host_id, ends_at, requirement_role_id, time.time()),
    )


async def set_giveaway_message(db: Database, giveaway_id: int, message_id: int):
    await db.execute("UPDATE giveaways SET message_id=? WHERE giveaway_id=?", (message_id, giveaway_id))


async def add_entry(db: Database, giveaway_id: int, user_id: int) -> bool:
    existing = await db.fetchone(
        "SELECT 1 FROM giveaway_entries WHERE giveaway_id=? AND user_id=?", (giveaway_id, user_id)
    )
    if existing:
        return False
    await db.execute(
        "INSERT INTO giveaway_entries (giveaway_id, user_id, entered_at) VALUES (?, ?, ?)",
        (giveaway_id, user_id, time.time()),
    )
    return True


async def get_entries(db: Database, giveaway_id: int) -> list[int]:
    rows = await db.fetchall("SELECT user_id FROM giveaway_entries WHERE giveaway_id=?", (giveaway_id,))
    return [r["user_id"] for r in rows]


async def get_active_giveaways(db: Database, guild_id: Optional[int] = None):
    if guild_id:
        return await db.fetchall(
            "SELECT * FROM giveaways WHERE status='active' AND guild_id=?", (guild_id,)
        )
    return await db.fetchall("SELECT * FROM giveaways WHERE status='active'")


async def end_giveaway(db: Database, giveaway_id: int, status: str = "ended"):
    await db.execute("UPDATE giveaways SET status=? WHERE giveaway_id=?", (status, giveaway_id))


# ───────────────────────── Moderation ─────────────────────────

async def add_warning(db: Database, guild_id: int, user_id: int, moderator_id: int, reason: str) -> int:
    return await db.execute(
        """INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (guild_id, user_id, moderator_id, reason, time.time()),
    )


async def get_warnings(db: Database, guild_id: int, user_id: int):
    return await db.fetchall(
        "SELECT * FROM warnings WHERE guild_id=? AND user_id=? ORDER BY created_at DESC",
        (guild_id, user_id),
    )


async def add_case(db: Database, guild_id: int, user_id: int, moderator_id: int, action: str,
                    reason: Optional[str] = None, duration_seconds: Optional[int] = None) -> int:
    return await db.execute(
        """INSERT INTO moderation_cases
           (guild_id, user_id, moderator_id, action, reason, duration_seconds, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (guild_id, user_id, moderator_id, action, reason, duration_seconds, time.time()),
    )


async def count_cases(db: Database, guild_id: int) -> int:
    row = await db.fetchone("SELECT COUNT(*) c FROM moderation_cases WHERE guild_id=?", (guild_id,))
    return row["c"] if row else 0


# ───────────────────────── Custom Commands ─────────────────────────

async def create_custom_command(db: Database, guild_id: int, name: str, response_type: str,
                                 content: str, role_restriction_id: Optional[int] = None,
                                 cooldown_seconds: int = 0):
    await db.execute(
        """INSERT INTO custom_commands
           (guild_id, name, response_type, content, role_restriction_id, cooldown_seconds, enabled, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)
           ON CONFLICT(guild_id, name) DO UPDATE SET
             response_type=excluded.response_type, content=excluded.content,
             role_restriction_id=excluded.role_restriction_id,
             cooldown_seconds=excluded.cooldown_seconds, enabled=1""",
        (guild_id, name.lower(), response_type, content, role_restriction_id, cooldown_seconds, time.time()),
    )


async def get_custom_command(db: Database, guild_id: int, name: str):
    return await db.fetchone(
        "SELECT * FROM custom_commands WHERE guild_id=? AND name=? AND enabled=1",
        (guild_id, name.lower()),
    )


async def list_custom_commands(db: Database, guild_id: int):
    return await db.fetchall("SELECT * FROM custom_commands WHERE guild_id=?", (guild_id,))


async def delete_custom_command(db: Database, guild_id: int, name: str):
    await db.execute("DELETE FROM custom_commands WHERE guild_id=? AND name=?", (guild_id, name.lower()))


async def toggle_custom_command(db: Database, guild_id: int, name: str, enabled: bool):
    await db.execute(
        "UPDATE custom_commands SET enabled=? WHERE guild_id=? AND name=?",
        (1 if enabled else 0, guild_id, name.lower()),
    )
