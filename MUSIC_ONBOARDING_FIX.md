# Nexora Core — Music / Voice Onboarding Fix

A Discord bot can have only one voice connection per guild. The onboarding and music systems therefore share that connection.

This build prevents onboarding cleanup from stopping a music connection after the bot has moved from the onboarding VC to the music VC. When a verified member leaves the onboarding VC, the music connection is left untouched.

Music still requires FFmpeg and yt-dlp on the Railway runtime. YouTube Data API credentials are not required for the yt-dlp playback path.
