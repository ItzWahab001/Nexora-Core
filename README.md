# 🤖 All-In-One Discord Bot

A modular, production-oriented Discord bot built with **discord.py 2.x**, slash commands,
buttons, select menus, and modals. Every major feature has its own dedicated interactive
panel, all reachable from a single `/menu` control center.

## Features

- 🎫 **Tickets** — multi-category panels, claim/add/remove/rename/transcript/close/delete
- 🎵 **Music** — yt-dlp powered playback with a live Now Playing panel
- 🎉 **Giveaways** — persistent entry buttons, auto-end, reroll, cancel
- 🤖 **AI Chat** — swappable OpenAI-compatible provider, per-user conversation memory
- 🛡️ **Moderation** — ban/kick/timeout/warn with role-hierarchy safety checks
- 🚨 **AutoMod** — spam, invite, link, word-filter, and mention-spam protection
- ✅ **Verification** — one-click role-gated verification
- 👋 **Welcome / Goodbye** — templated join/leave messages
- 🎭 **Auto Role** — automatic role assignment on join
- ⚙️ **Custom Commands** — guild-defined `!trigger` → response commands
- 📋 **Logging** — centralized, configurable event log channel
- 🔧 **Utilities** — ping, userinfo, serverinfo, roleinfo, channelinfo, botinfo, uptime, invite
- 🔐 **Admin Panel** — one place to find every system's configuration commands

## Requirements

- Python 3.11+
- An `ffmpeg` binary on your system PATH (required for music playback)
- A Discord bot application + token
- (Optional) An OpenAI-compatible API key for AI chat

## Installation

```bash
git clone <your-repo-url>
cd bot
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and fill in `DISCORD_TOKEN` at minimum. See **.env configuration** below.

## Discord Developer Portal Setup

1. Go to https://discord.com/developers/applications and create a New Application.
2. Under **Bot**, click "Add Bot", then copy the token into `.env` as `DISCORD_TOKEN`.
3. Under **Bot > Privileged Gateway Intents**, enable:
   - **Server Members Intent** (required — welcome/goodbye, autorole, userinfo)
   - **Message Content Intent** (required — custom commands, AI channel replies)
4. Under **OAuth2 > URL Generator**, select scopes `bot` and `applications.commands`,
   and the bot permissions listed below, then use the generated URL to invite the bot.

## Required Intents

- `guilds`
- `members` (privileged)
- `message_content` (privileged)
- `voice_states` (for music)

These are already set in `main.py` (`INTENTS`) — you only need to enable the privileged
ones in the Developer Portal as described above.

## Required Permissions

At minimum: View Channels, Send Messages, Embed Links, Attach Files, Manage Messages,
Manage Channels, Manage Roles, Kick Members, Ban Members, Moderate Members, Connect,
Speak, Read Message History, **Manage Server** (required for `/automod setup` to create
a native Discord AutoMod rule — without it, our custom AutoMod filters still work, just
not the native-rule layer). For simplicity during setup, granting **Administrator** is
easiest, but scope it down for production.

**Important role ordering:** the bot's own role must sit *above* any role it needs to
manage (tickets' overwrite creation, autorole assignment, moderation actions). The bot
will refuse to act on members/roles above its own position — see `utils/permissions.py`.

## .env Configuration

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `DISCORD_TOKEN` | **Required.** Your bot's token. Never commit this. |
| `DEV_GUILD_ID` | Optional. Set during development for instant (guild-scoped) slash command sync. |
| `OWNER_IDS` | Comma-separated Discord user IDs with bot-owner access (`/admin reload`, `/admin sync`). |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | AI chat provider config (OpenAI-compatible). |
| `DATABASE_PATH` | SQLite file path, defaults to `data/bot.db`. |
| `LOG_LEVEL` / `LOG_FILE` | Logging verbosity and output file. |

## Database Setup

No manual setup needed. On first run, `database/database.py` creates `data/bot.db` and
applies the schema in `database/models.py` automatically via `database/migrations.py`
(which uses SQLite's `PRAGMA user_version` for future schema versioning).

## Running the Bot

```bash
python main.py
```

On startup you'll see:

```
💾 Database: Connected
📦 Cogs: 16/16 loaded
🔐 Persistent views restored.
⚡ Commands: Synced N commands ...
🤖 Bot: Online as YourBot#0000
🔐 Security: Active
```

Then run `/menu` in your server to open the control center.

## Troubleshooting

- **Slash commands don't show up:** global syncs can take up to an hour to propagate.
  Set `DEV_GUILD_ID` in `.env` during development for instant guild-scoped sync.
- **Music doesn't play / errors about ffmpeg:** install ffmpeg and ensure it's on PATH.
- **"Missing Access" errors:** check the bot's role is above the roles/channels it's
  trying to manage, and that it has the relevant permission.
- **AI commands say "not configured":** set `AI_API_KEY` in `.env` and restart.
- **Privileged intent errors on connect:** enable Server Members + Message Content
  intents in the Developer Portal (see above).

## Adding Cogs

1. Create `cogs/your_feature.py` with a `class YourFeature(commands.Cog)` and an
   `async def setup(bot): await bot.add_cog(YourFeature(bot))` at the bottom.
2. Add `"cogs.your_feature"` to the `COGS` list in `main.py`.
3. Add any new tables to `database/models.py` (`SCHEMA_STATEMENTS`) and matching
   accessor methods to `database/database.py`.

## Adding New Panels

1. Create `views/your_panel.py` with a `build_your_panel(...)` function returning
   `(embed, view)`, using `views/common.PanelView` as the base so Home/Back/Close work
   automatically.
2. Add an entry to `FEATURES` in `views/main_menu.py` and a branch in `route_to_panel()`.

## Adding Future Features

The architecture is intentionally split (database / cogs / views / services / utils) so
new systems — economy, leveling, reaction roles, polls, reminders, a web dashboard, etc.
— can be added as new files without touching existing ones:

- New persistent data → new table(s) in `database/models.py` + methods in `database/database.py`.
- New commands → new cog in `cogs/`.
- New interactive UI → new view in `views/`, linked from `views/main_menu.py`.
- New external integration (a different AI provider, Redis, PostgreSQL) → new file in
  `services/`, swapped in behind the same interface the cogs already call.

## Deployment Guidance

- Run under a process manager (`systemd`, `pm2`, Docker) so the bot restarts on crash.
- SQLite (WAL mode is enabled) is fine for small-to-medium bots; for very large
  multi-guild deployments, swap `database/database.py`'s backend for PostgreSQL —
  the rest of the codebase only calls the `Database` class's methods, not SQL directly.
- Keep `.env` out of version control (`.gitignore` it) and never log the token.
- Back up `data/bot.db` regularly if you don't migrate to a managed database.


## Production music + AI fixes

This version includes a `Dockerfile` that installs FFmpeg, libopus and Deno
automatically. Deno is used by current yt-dlp for full YouTube support, while
`yt-dlp[default]` installs the matching EJS package.

For AI chat, set:
```env
AI_API_KEY=your_real_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```
Then restart the bot.

AI commands are `/ai`, `/ask`, and `/chat`. AI configuration is now under
`/aiconfig setup`, `/aiconfig enable`, `/aiconfig disable`, `/aiconfig channel`,
and `/aiconfig reset`. This avoids a Discord application-command name collision.

Music now checks FFmpeg before connecting, uses a safe captured asyncio event
loop for queue advancement, uses fresh yt-dlp extractor instances, has bounded
network retries/timeouts, and reports setup failures instead of remaining on
Discord's "thinking..." state.

The music queue command is `/clearqueue` because `/clear` is reserved for the
moderation message-delete command.
