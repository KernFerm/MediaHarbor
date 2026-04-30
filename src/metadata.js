const { spawn } = require('child_process');
const { validatePublicUrl, resolveBinary } = require('./security');

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return null;
  }

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return [hrs, mins, secs]
    .filter((value, index) => value > 0 || index > 0)
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function fetchMetadata({ url }) {
  const safeUrl = validatePublicUrl(url);
  const ytDlpPath = resolveBinary('yt-dlp');

  return new Promise((resolve, reject) => {
    const args = ['--dump-single-json', '--no-playlist', safeUrl];
    const child = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', () => {
      reject(new Error('MediaHarbor could not find yt-dlp. If it was not included with your copy of the app, add yt-dlp and reopen the app.'));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || 'Metadata lookup failed.'));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const formats = Array.isArray(parsed.formats)
          ? parsed.formats
              .filter((format) => format.format_id)
              .slice(0, 24)
              .map((format) => ({
                formatId: format.format_id,
                label: [format.ext, format.resolution || format.format_note || format.acodec || 'best']
                  .filter(Boolean)
                  .join(' - ')
              }))
          : [];

        resolve({
          title: parsed.title,
          track: parsed.track,
          artist: parsed.artist,
          album: parsed.album,
          thumbnail: parsed.thumbnail,
          uploader: parsed.uploader,
          channel: parsed.channel,
          duration: parsed.duration,
          durationString: formatDuration(parsed.duration),
          extractor: parsed.extractor,
          formats
        });
      } catch {
        reject(new Error('Metadata response was invalid.'));
      }
    });
  });
}

module.exports = {
  fetchMetadata
};
