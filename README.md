# Professional Discord Voice Onboarding + All-in-One Bot

A modular Discord.py bot centered around role-based voice onboarding, verification, tickets, applications, giveaways, moderation, AI, music, welcome/goodbye, custom commands, statistics, SQLite persistence, and restart recovery.

## Important Discord configuration

Create these roles/channels first (or use your own IDs):
- `New Member` role
- `Verified` role
- `Staff` role
- `🌱・Greetings / Introduction` voice channel
- verification text channel

### Permission architecture

The bot does not rely on hidden buttons for security. Use Discord role/channel permission overwrites:

**@everyone**
- Normal public channels: denied until your server policy allows them.
- Staff channels: denied.

**New Member**
- Allow View Channel + Connect/Speak only for the onboarding VC.
- Allow View Channel in verification channel.
- Deny normal community categories/channels.

**Verified**
- Allow normal community categories/channels.
- Never grant staff/private category access.

The bot can assign/remove roles, but it cannot magically override a bad server permission layout. Configure category overwrites carefully and keep the bot role above `New Member` and `Verified`.

## Install

1. Install Python 3.11+.
2. Install FFmpeg and ensure `ffmpeg` is on PATH.
3. Create a virtual environment.
4. Install requirements:
   `python -m pip install -r requirements.txt`
5. Copy `.env.example` to `.env`.
6. Put your bot token in `.env`.
7. In the Discord Developer Portal, enable **Server Members Intent**, **Message Content Intent**, and **Voice State Intent** as required by this project.
8. Invite the bot with the permissions it needs, including Manage Roles, Manage Channels, View Channels, Connect, Speak, Send Messages, Embed Links, Read Message History, and moderation permissions for moderation commands.
9. Start:
   `python bot.py`

## First onboarding setup

After the bot is online, an administrator can run:

`/onboarding setup <voice channel> <verification channel> <new member role> <verified role>`

Then run `/verification panel` in the verification channel.

Set rules and welcome speech with:
- `/onboarding message`
- `/onboarding rules`

The bot reconnects to the configured onboarding VC after restart.

## Voice/TTS notes

TTS uses an interface (`TTSProvider`) and the default implementation is Edge TTS. Generated audio is cached in `data/tts`. FFmpeg is required to play MP3 audio into Discord voice.

A Discord voice channel can have one bot connection per guild. The implementation therefore uses a single persistent onboarding connection per guild and moves that connection to the onboarding member's voice channel only when speech is needed. If your server requires the bot to remain permanently in the fixed onboarding VC while simultaneously speaking privately to several members, Discord's guild voice model does not provide independent bot voice connections to multiple channels in the same guild. For true per-member simultaneous voice rooms, create temporary onboarding VCs and configure a dedicated bot connection per room/guild architecture.

## Tickets

`/ticket-panel` posts the persistent ticket button. Configure `ticket_category_id` and `staff_role_id` in SQLite or extend the admin configuration command for your server.

Ticket records persist in SQLite. Ticket controls are registered as persistent views after restart.

## Applications

`/application-panel` posts a modal-based application panel.
Staff can inspect with `/applications` and decide with `/application-review <id> accept|deny`.

## Giveaways

`/giveaway <duration_seconds> <winners> <prize>` creates a persistent button giveaway.
`/giveaway-reroll <id>` rerolls.
`/giveaway-cancel <id>` cancels.

## Moderation

Available:
- `/ban`
- `/kick`
- `/timeout`
- `/warn`
- `/warnings`
- `/clear`
- `/slowmode`
- `/lock`
- `/unlock`

All destructive moderation actions use Discord permission checks and write case/warning history to SQLite.

## AI

Configure `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`. `/ai <prompt>` uses an OpenAI-compatible chat-completions endpoint. API keys are never hardcoded.

## Music

`/play`, `/pause`, `/resume`, `/skip`, `/stop` are included. Music uses yt-dlp + FFmpeg. Respect the terms and policies of any media service you use.

## Security

Never commit `.env`, the SQLite database, or generated TTS audio to source control. Keep the bot's role below only the roles it is intended to manage, and above `New Member`/`Verified` if it must assign them.

## QA checklist

Before production:
- Test new-member role assignment.
- Test category/channel overwrites with a non-admin test account.
- Test joining/leaving/rejoining onboarding VC.
- Test bot restart and voice reconnection.
- Test verification role changes.
- Test ticket controls after restart.
- Test application persistence.
- Test giveaway ending/reroll/cancel.
- Test moderation hierarchy and permissions.
- Test FFmpeg/TTS on the actual host.
- Test AI provider rate/error responses.

## Scope note

This package is a complete runnable baseline with real implementations for the requested systems. Server-specific Discord permission layouts, third-party API credentials, FFmpeg installation, and provider policies necessarily depend on the deployment environment.
