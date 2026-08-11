# MediaHarbor Release Notes

## MediaHarbor 0.1.0

MediaHarbor is a desktop app for saving supported public media to your PC with a simple local-first workflow.

This release includes:

- public link preview before download
- video and audio-only downloads
- supported public platforms such as YouTube, Instagram, TikTok, X, and Reddit
- local media processing tools
- local-only history storage
- a Windows installer with license and privacy acknowledgement
- bundled `yt-dlp.exe` from KernFerm release `2026-07-05-yt-dlp`
- bundled `ffmpeg.exe` `9.0-essentials_build-www.gyan.dev`
- bundled `ffprobe.exe` `9.0-essentials_build-www.gyan.dev`
- stronger tunnel/backend SSRF protections with DNS-backed private-address blocking
- stronger local settings encryption with a per-install secret and automatic migration from older local data

## Included In This Windows Release

- `MediaHarbor-Setup-0.1.0.exe`
- bundled `yt-dlp.exe` from KernFerm release `2026-07-05-yt-dlp`
- bundled `ffmpeg.exe` `9.0-essentials_build-www.gyan.dev`
- bundled `ffprobe.exe` `9.0-essentials_build-www.gyan.dev`

End users should not need to install those tools separately for the packaged app.

Dependency versions in `0.1.0` include:

- `electron` `^43.3.0`
- `electron-builder` `^26.15.3`
- `express` `^5.1.0`
- `dotenv` `^17.4.2`
- `electron-store` `^11.0.2`
- `compression` `^1.8.1`
- `cors` `^2.8.5`
- `express-rate-limit` `^8.6.2`
- `helmet` `^8.3.0`

## How To Use

1. Install MediaHarbor.
2. Open the app.
3. Paste a supported public link.
4. Click `Preview`.
5. Choose a save folder.
6. Click `Start download`.

## Notes

- Use MediaHarbor only with public content you own or have permission to save.
- No DRM bypassing, paywall bypassing, private account access, or login-only scraping is included.
- Download history stays on the local device.
- Advanced tunnel settings are optional and intended for private self-hosted use.
- Some previously accepted internal/private targets are now intentionally blocked by stricter URL validation.

## Windows Notice

Depending on your Windows settings, you may see a SmartScreen notice the first time you open the installer. This can happen with newer apps before they build up Windows reputation.

## Project Documents

- `README.md` for end users
- `developer-readme.md` for local development and build notes
- `SECURITY.md` for security information
