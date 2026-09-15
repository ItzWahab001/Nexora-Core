# All-in-One Discord Bot — Voice Onboarding Edition

A production-oriented Discord bot built with `discord.py` 2.x, centered on
**automatic voice-based member onboarding and verification**, plus a full
suite of server-management systems (tickets, applications, giveaways,
moderation, AI chat, music, welcome/goodbye, custom commands, statistics).

## ⚠️ Please read before deploying

This project was generated in one sitting to cover an extremely broad spec
(12+ full subsystems). Every feature listed below is **real, wired-up code**
— no `TODO`s, no placeholder functions, no fake buttons. But a codebase this
size cannot be responsibly called "fully QA-tested in production across
every edge case" without actually running it against a live Discord server,
which I can't do from here (no network access in this environment, and no
Discord bot token to test with). Please treat this as a strong, working
first deployment candidate, and:

1. Run it in a **test server** first, not your live community.
2. Read through `cogs/onboarding.py` and `voice/onboarding_manager.py`
   carefully — that's the most complex and most important part.
3. Come back with any error you hit; I'll fix it fast. Multi-user voice
   race conditions, permission edge cases, and Discord API quirks are the
   most likely places something needs a tweak once it meets real traffic.

## Setup

```bash
python3.11 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env — at minimum set DISCORD_TOKEN
```

You also need **FFmpeg** installed and on your PATH (required for both
voice onboarding TTS playback and music playback):
- Windows: https://ffmpeg.org/download.html (add to PATH)
- macOS: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

Run the bot:

```bash
python bot.py
```

On first run, DM the bot's owner account and use the text command
`!sync` (owner-only) once to register slash commands globally, or
`!sync-guild` while inside your test server for instant per-guild sync.

## Voice Onboarding — the core feature

Zero-config default: `TTS_PROVIDER=edge` in `.env` uses the free
`edge-tts` library (no API key). To use a paid provider instead, set:

```
TTS_PROVIDER=elevenlabs   # or openai
TTS_API_KEY=your_key
TTS_VOICE=voice_id
```

Setup flow in Discord:
1. `/onboarding-panel` — set the Greetings VC, verification text channel,
   Unverified role, and Verified role using the dropdowns.
2. `/onboarding-lockdown` — automatically hides every other channel from
   the Unverified role and exposes only the onboarding VC + verification
   channel.
3. Toggle **Enable/Disable** in the panel once both roles/channels are set.
4. Test end-to-end: join the onboarding VC as a non-verified test account.
   The bot connects, speaks a personalized intro, then posts a **Verify**
   button in the verification channel.

Security note: the Verify button re-checks the user's verification status
server-side on every click — visibility of the button is never the only
gate.

## Feature map

| System | Slash commands |
|---|---|
| Voice Onboarding | `/onboarding-panel`, `/onboarding-lockdown` |
| Verification | `/verify-panel`, `/verify-member`, `/unverify-member` |
| Tickets | `/ticket-panel`, `/ticket-settings`, `/ticket-add`, `/ticket-remove`, `/ticket-rename`, `/ticket-reopen` |
| Applications | `/application-create-type`, `/application-panel`, `/application-log-channel` |
| Giveaways | `/giveaway-create`, `/giveaway-reroll`, `/giveaway-cancel` |
| Moderation | `/ban`, `/unban`, `/kick`, `/timeout`, `/warn`, `/warnings`, `/clear`, `/slowmode`, `/lock`, `/unlock`, `/mod-log-channel` |
| AI Chat | `/ai-settings` (requires `AI_API_KEY` in `.env`) |
| Music | `/play`, `/skip`, `/stop`, `/queue`, `/volume` (plus in-embed buttons) |
| Welcome/Goodbye | `/welcome-panel` |
| Custom Commands | `/customcommand-create`, `/customcommand-manage` |
| Statistics | `/stats` |
| Bot Settings | `/settings-overview`, `/set-prefix`, `!sync`, `!sync-guild` |

## Architecture

```
bot.py                     # entry point, wiring, persistent view registration
config.py                  # env-based configuration, never hardcode secrets
database/
  db.py                    # aiosqlite connection + full schema
  repo.py                  # typed query functions, one section per domain
tts/
  base.py                  # TTSProvider interface
  providers.py             # Edge (free) / ElevenLabs / OpenAI implementations
  cache.py                 # disk cache for generated audio
voice/
  onboarding_manager.py    # the core voice onboarding engine
cogs/                      # one file per feature system
views/                     # buttons / selects / modals for every panel
```

## Database

SQLite by default (`data/bot.db`), created automatically on first run.
Tables: `guild_settings`, `members`, `onboarding_sessions`,
`verification_log`, `tickets`, `applications`, `application_types`,
`giveaways`, `giveaway_entries`, `warnings`, `moderation_cases`,
`custom_commands`, `logs`.

To move to PostgreSQL later: swap `database/db.py`'s `aiosqlite` calls for
`asyncpg`/`psycopg` — the schema uses only portable types and `repo.py`'s
function signatures don't need to change.

## Restart recovery

On startup the bot:
- reconnects to any onboarding VC that still has unverified members in it
- re-registers persistent views for the verification button, ticket
  panels, active giveaways, and pending applications so their
  buttons/selects keep working
- resumes onboarding progress from `onboarding_sessions` (stage-based,
  so a member who left mid-greeting picks back up on rejoin)

## Known limitations to be upfront about

- Only one voice connection per guild (a Discord limitation, not a bug) —
  if two people join the onboarding VC at once, the bot greets them one
  after another via an internal queue rather than truly simultaneously.
- Music playback depends on `yt-dlp`, which occasionally needs updating
  (`pip install -U yt-dlp`) as streaming sites change their internals.
- AI chat requires your own Anthropic API key and is a simple
  single-channel implementation — no per-thread conversations yet.

## Deployment Preflight

Run this before starting the bot:

```bash
python -m pip install -r requirements.txt
python smoke_test.py
```

Music requires the `ffmpeg` executable to be installed and available on `PATH`.
AI chat requires `AI_API_KEY`; if it is absent, AI chat remains disabled rather than crashing startup.
A real Discord token and network connection are required for live Discord/API verification.

### Android / Termux

```bash
pkg update
pkg install python ffmpeg -y
python -m pip install -U pip
python -m pip install -r requirements.txt
python smoke_test.py
python bot.py
```

Never put `DISCORD_TOKEN` or API keys into source files. Keep them in `.env`.
