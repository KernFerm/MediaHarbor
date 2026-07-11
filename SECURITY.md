# MediaHarbor Security

This document gives a short overview of MediaHarbor's current security posture and how to report a security issue.

## Supported Version

- `0.0.80`

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
- filenames are sanitized before files are written
- raw user input is not passed directly into shell commands
- sensitive settings are encrypted locally
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
- `0.0.67` includes a refreshed bundled `yt-dlp.exe` and updated app dependencies
