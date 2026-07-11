# MediaHarbor

![Version](https://img.shields.io/badge/version-0.0.80-2ea44f)
![Platform](https://img.shields.io/badge/platform-Windows-0078d4)
![Electron](https://img.shields.io/badge/Electron-43.1.0-47848f?logo=electron&logoColor=white)
![License](https://img.shields.io/badge/license-Apache_2.0-blue)

Save public media to your PC with a simple local-first workflow. Paste a supported public link, preview it, choose where to save it, and download it locally.

## What MediaHarbor Is

MediaHarbor is a desktop app for saving supported public media to your own PC for lawful personal use. It is designed to stay simple for everyday use while keeping settings and download history on your device.

It works with many public links supported by `yt-dlp`, including popular platforms like YouTube, Instagram, TikTok, X, and Reddit.

## What MediaHarbor Does

- Save public videos, audio, images, and posts when supported
- Show a preview first, including title, thumbnail, duration, and format choices
- Download audio only when you do not need the full video
- Keep download history on your own device
- Offer optional local tools for audio extraction and media conversion
- Offer an optional self-hosted privacy tunnel for advanced users

## How To Use It

1. Open MediaHarbor.
2. Paste a supported public link into the `Public link` box.
3. Click `Preview` to load the title, thumbnail, and available quality options.
4. Choose where you want the file saved.
5. If needed, switch to `Audio-only download`.
6. Click `Start download`.

For local processing tools:

1. Open the `Local processing` section.
2. Choose an input media file.
3. Choose an output location.
4. Pick a mode like `Extract audio` or `Remux to MP4`.
5. Click `Run local process`.

## What MediaHarbor Does Not Do

- No DRM bypassing
- No paywall bypassing
- No private account access
- No login-only scraping
- No ads
- No user accounts
- No telemetry or analytics

Please make sure you have permission to save the content you download.

## Privacy

- Your download history stays on your device
- The app is designed not to collect analytics or telemetry
- Sensitive settings are encrypted on your device using a per-install local secret
- Advanced tunnel mode is optional and intended for private self-hosted use

## Security Notes

Version `0.0.80` includes:

- refreshed bundled `yt-dlp.exe`
- refreshed bundled `ffmpeg.exe`
- refreshed bundled `ffprobe.exe`
- stronger tunnel/backend URL validation, including DNS-backed checks against private and loopback targets
- stronger local settings encryption that no longer falls back to a predictable machine-derived key

## Common Issues

If something is not working, these are the most common reasons:

- `yt-dlp` is missing, which is needed for previewing and downloading supported links
- `ffmpeg` is missing, which is needed for audio extraction and local media processing
- the link is private, login-only, unsupported, or blocked by security validation
- the save folder is not set
- the selected output file type does not match the processing mode

MediaHarbor should show a friendly message when one of these tools is missing.

For most 64-bit Windows PCs, the easiest files are:

- `yt-dlp.exe`
- `ffmpeg-release-essentials.zip`

## Troubleshooting

- If `Preview` does not work, make sure the link is public and supported.
- If downloads fail, try previewing first so MediaHarbor can load the best metadata and format options.
- If local processing fails, make sure the output type matches the mode.
- `Extract audio` uses `.mp3`
- `Remux to MP4` uses `.mp4`
- `Transcode to H.264` uses `.mp4`
- If the app seems stuck, close and reopen MediaHarbor and try again.
- If you changed system tools or settings, reopen the app so it can detect them again.

## Advanced Users

MediaHarbor includes an optional `Privacy Tunnel (Advanced)` section for people who run their own private backend.

If that is not you, you can safely leave advanced settings off.

## Installer Notes

The Windows installer includes:

- a welcome screen
- the software license agreement
- a privacy and data collection acknowledgement

## Windows SmartScreen

Depending on your Windows settings, you may see a SmartScreen notice the first time you open the installer. This can happen with newer apps before they build up Windows reputation.

## License

- Apache 2.0
