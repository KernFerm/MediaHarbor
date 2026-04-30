# MediaHarbor

Save public media to your PC with a simple, clean workflow. Paste a public link, preview it, choose where you want it saved, and download it locally. 🌊

## 💡 What MediaHarbor Is

MediaHarbor is a desktop app for saving supported public media to your own PC for lawful personal use. It is designed to be simple for everyday use, with a local-first setup that keeps your download history and settings on your device.

It works with many public links supported by `yt-dlp`, including popular platforms like YouTube, Instagram, TikTok, X, and Reddit.

## ✨ What MediaHarbor Does

- Save public videos, audio, images, and posts when supported
- Show a preview first, including title, thumbnail, duration, and formats
- Download audio only when you do not need the full video
- Keep your download history on your own device
- Offer optional local tools for audio extraction and media conversion

## 🧭 How To Use It

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

## 🚫 What MediaHarbor Does Not Do

- No DRM bypassing
- No paywall bypassing
- No private account access
- No login-only scraping
- No ads
- No user accounts
- No telemetry or analytics

Please make sure you have permission to save the content you download. 📌

## 🚀 Quick Start

Most people only need the normal local download mode. Easy and simple. ✅

## 🔒 Privacy

- Your download history stays on your device
- The app is designed not to collect analytics or telemetry
- Sensitive settings are encrypted on your device
- Advanced tunnel mode is optional and meant for private self-hosted use

## ⚠️ Common Issues

If something is not working, these are the most common reasons:

- `yt-dlp` is missing, which is needed for previewing and downloading supported links
- `ffmpeg` is missing, which is needed for audio extraction and local media processing
- the link is private, login-only, or not supported
- the save folder is not set
- the selected output file type does not match the processing mode

MediaHarbor should show a friendly message when one of these tools is missing.

For most 64-bit Windows PCs, the easiest files are:

- `yt-dlp.exe`
- `ffmpeg-release-essentials.zip`

## 🛠️ Troubleshooting

- If `Preview` does not work, make sure the link is public and supported.
- If downloads fail, try previewing first so MediaHarbor can load the best metadata and format options.
- If local processing fails, make sure the output type matches the mode:
  `Extract audio` uses `.mp3`
  `Remux to MP4` uses `.mp4`
  `Transcode to H.264` uses `.mp4`
- If the app seems stuck, close and reopen MediaHarbor and try again.
- If you changed system tools or settings, reopen the app so it can detect them again.

## ⚙️ Advanced Users

MediaHarbor includes an optional `Privacy Tunnel (Advanced)` section for people who run their own private backend.

If that is not you, you can safely leave advanced settings off. 🙂

## 📦 Installer Notes

The Windows installer includes:

- a welcome screen
- the software license agreement
- a privacy and data collection acknowledgement

## 🪟 Windows SmartScreen

Depending on your Windows settings, you may see a SmartScreen notice the first time you open the installer. This can happen with newer apps before they build up Windows reputation.

## 📄 License

- > Apache 2.0
