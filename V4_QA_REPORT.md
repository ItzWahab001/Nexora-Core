# Nexora-Core-v4 QA Report

## Offline checks
- Python compileall: PASS
- ZIP integrity: verified before delivery
- Discord slash-command source scan: performed
- Railway Dockerfile: FFmpeg + libopus + Node.js runtime included
- Music: yt-dlp default + fallback extractor strategies
- Music/onboarding: single-guild voice ownership guard added
- Verification: onboarding timeout is cancelled after successful verification

## Live checks not possible here
Discord gateway, YouTube extraction, and third-party API calls require network access and valid credentials.
No claim of live playback verification is made.
