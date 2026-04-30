# MediaHarbor Developer Guide

This guide is for working on MediaHarbor locally, installing dependencies, running the app, and building Windows packages.

## What This Project Uses

- Electron for the desktop app
- Express for the local/private backend
- `yt-dlp` for metadata lookup and downloads
- `ffmpeg` for local media processing
- `electron-builder` for packaging and the Windows installer

## Requirements

Before you start, make sure you have:

- Node.js 20 or newer
- npm
- Windows PowerShell
- `yt-dlp.exe`
- an FFmpeg essentials zip or extracted FFmpeg binaries

## Install Dependencies

From the project root, run:

```bash
npm install
```

This installs Electron, Express, electron-builder, and the rest of the project dependencies.

## Project Tools

MediaHarbor expects these tools for local media features:

- `yt-dlp.exe`
- `ffmpeg.exe`
- `ffprobe.exe`

### yt-dlp

For local development, place `yt-dlp.exe` in the project root:

```text
MediaHarbor/
  yt-dlp.exe
```

### FFmpeg

You can either:

1. place `ffmpeg.exe` and `ffprobe.exe` directly in the project root, or
2. place an FFmpeg essentials zip in the project root and let the prep script extract it

Example supported zip name:

```text
ffmpeg-8.1-essentials_build.zip
```

Then run:

```bash
npm run prepare:ffmpeg
```

That script extracts the zip and copies `ffmpeg.exe` and `ffprobe.exe` into the project root.

## Environment Setup

The app uses `.env` for local configuration.

Typical local values include:

```env
APP_PORT=3467
BACKEND_BASE_URL=http://127.0.0.1:3467
TRUST_PROXY=false
```

For local desktop use, `BACKEND_BASE_URL` can stay on `http://127.0.0.1:3467`.

## Run The App

Start the app with:

```bash
npm start
```

For development mode:

```bash
npm run dev
```

## Run The Backend Only

If you want to run just the backend:

```bash
npm run backend
```

## Syntax Check

To run the project syntax checks:

```bash
npm run check
```

## Build Commands

### Unpacked App

For a local unpacked build:

```bash
npm run pack
```

This creates an unpacked Electron build in `dist/`.

### Windows Installer

To create the Windows installer:

```bash
npm run dist:win
```

This builds the NSIS installer in `dist/`.

## Installer Notes

The installer is configured through:

- `package.json`
- `build/installer.nsh`

It currently includes:

- a welcome page
- the license agreement page
- a privacy acknowledgement page

## Local App Data

During development, MediaHarbor stores local settings and history in Windows app data under folders like:

```text
%APPDATA%\MediaHarbor
%APPDATA%\mediaharbor
```

If you need a clean reset before testing a new installer, remove those folders.

## Common Development Tasks

### Rebuild the installer after UI or config changes

```bash
npm run dist:win
```

### Clear local app state

Delete the MediaHarbor app-data folders under `%APPDATA%`.

### Test bundled binaries

Check these files exist in the project root:

```text
yt-dlp.exe
ffmpeg.exe
ffprobe.exe
```

## Project Structure

Important files and folders:

```text
main.js
preload.js
renderer.js
index.html
styles.css
src/
server/
build/
scripts/
package.json
```

## Notes For Public Releases

- The main `README.md` is written for end users.
- This file is for contributors and local development.
- Public Windows releases may still show SmartScreen warnings if the installer is not code-signed.
- Downloaded media is intentionally not removed during uninstall.

