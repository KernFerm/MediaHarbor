# MediaHarbor Security

This document explains the current security posture of MediaHarbor, how security is handled in the app, and how to report security issues responsibly.

## Supported Version

The currently supported release covered by this document is:

- ✅ `0.0.60`

## Supported Scope

MediaHarbor is designed for lawful personal media downloads from public content only.

Security expectations for this project include:

- no DRM bypassing
- no paywall bypassing
- no private account access
- no login-only scraping
- no hidden telemetry or analytics
- no unsafe shell execution with raw user input

## Security Features

MediaHarbor currently includes these security controls:

### Electron App

- `nodeIntegration` disabled in the renderer
- `contextIsolation` enabled
- `sandbox` enabled
- `contextBridge` used through `preload.js`
- restrictive Content Security Policy
- external links validated before opening
- native file dialogs used for local file selection

### Download and Processing Safety

- public URLs are validated before use
- private and loopback hosts are blocked for public media input
- filenames are sanitized before writing files
- `child_process.spawn()` uses safe argument arrays
- raw user input is not passed directly into shell commands
- local media processing runs on the user device

### Backend API

- `helmet` for safer HTTP headers
- `cors` restrictions
- request compression
- rate limiting with `express-rate-limit`
- basic bot protection and proof-of-work challenge support
- environment-based backend configuration
- HTTPS required for production backend use
- stricter proxy trust handling for safer rate limiting

### Privacy

- download history stays local to the user device
- sensitive settings are encrypted locally
- no built-in analytics
- no built-in telemetry
- no intentional server-side personal request logging

## Developer Security Notes

When working on MediaHarbor:

- never add DRM bypass features
- never add paywall bypass features
- never add private-account scraping
- never expose secrets to the renderer process
- never hardcode private keys or access tokens
- keep backend secrets in environment variables
- validate all new external inputs
- keep binary invocation locked to safe argument arrays

## Reporting A Security Issue

If you discover a security issue, please report it privately and do not publish exploit details immediately.

Include:

- a short description of the issue
- affected file or feature
- steps to reproduce
- expected behavior
- actual behavior
- screenshots or logs if helpful

## Known Security Limitations

These are important realities to understand:

- Windows SmartScreen reputation is separate from the internal app security model
- an unsigned installer may still trigger warnings on end-user systems
- self-hosted tunnel/privacy features are only as private as the hosting environment
- bundled third-party tools like `yt-dlp` and `ffmpeg` should be kept up to date
- public backend deployment requires real operational hardening beyond app code alone

## Recommended Ongoing Practices

- keep dependencies updated
- run `npm audit` regularly
- review Electron and Express dependency updates
- test installer behavior after security-related changes
- verify local app data cleanup during uninstall testing
- use code signing for public Windows releases when possible

## Future Hardening Ideas

Possible future improvements include:

- stricter request schema validation with `zod`
- optional request slow-down middleware
- automated dependency monitoring in GitHub
- stronger backend abuse controls for public deployments
