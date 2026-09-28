# MediaHarbor Security

This document gives a short overview of MediaHarbor's current security posture and how to report a security issue.

## Supported Version

- `0.1.2`

## Security Scope

MediaHarbor is intended for lawful personal media downloads from public content only.

The project does not include:

- DRM bypassing
- paywall bypassing
- private account access
- login-only scraping
- hidden telemetry or analytics

## Core Protections

- renderer `nodeIntegration` is disabled
- `contextIsolation` and `sandbox` are enabled
- external links are validated before opening
- public URLs are validated before use
- tunnel/backend URLs now include DNS-backed blocking for private, loopback, and link-local targets
- filenames are sanitized before files are written
- output paths are checked to stay inside the selected folder
- downloads use only the canonical output folder persisted through the native folder picker
- the media streaming endpoint has a dedicated rate limit in addition to the backend-wide limit
- raw user input is not passed directly into shell commands
- sensitive settings are encrypted locally with a per-install secret
- older local settings can be migrated forward to the stronger encryption model
- download history stays on the local device

## Reporting Security Issues

Please report security issues privately and avoid posting exploit details in public right away.

Include:

- a short description
- affected feature or file
- reproduction steps
- expected behavior
- actual behavior

## Notes

- unsigned Windows installers may still trigger SmartScreen warnings
- bundled tools like `yt-dlp` and `ffmpeg` should be kept up to date
- `0.1.2` includes official yt-dlp `2026.08.19`, FFmpeg/ffprobe `9.0.2`, and the current URL-validation and local-encryption hardening
