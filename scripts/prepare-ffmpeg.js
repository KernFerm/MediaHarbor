const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const ffmpegExePath = path.join(projectRoot, 'ffmpeg.exe');
const ffprobeExePath = path.join(projectRoot, 'ffprobe.exe');

async function main() {
  if (fs.existsSync(ffmpegExePath) && fs.existsSync(ffprobeExePath)) {
    console.log('FFmpeg binaries already exist in the project root.');
    return;
  }

  const entries = await fsp.readdir(projectRoot);
  const zipName = entries.find((entry) => /^ffmpeg-.*essentials.*\.zip$/i.test(entry));

  if (!zipName) {
    console.log('No FFmpeg essentials zip found. Skipping FFmpeg extraction.');
    return;
  }

  const zipPath = path.join(projectRoot, zipName);
  const extractDir = path.join(os.tmpdir(), `mediaharbor-ffmpeg-${Date.now()}`);
  await fsp.mkdir(extractDir, { recursive: true });

  const command = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Could not extract the FFmpeg zip archive.');
  }

  const ffmpegFound = await findFile(extractDir, 'ffmpeg.exe');
  const ffprobeFound = await findFile(extractDir, 'ffprobe.exe');

  if (!ffmpegFound || !ffprobeFound) {
    throw new Error('The FFmpeg zip did not contain both ffmpeg.exe and ffprobe.exe.');
  }

  await fsp.copyFile(ffmpegFound, ffmpegExePath);
  await fsp.copyFile(ffprobeFound, ffprobeExePath);
  console.log('Copied ffmpeg.exe and ffprobe.exe into the project root for bundling.');
}

async function findFile(dir, fileName) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === fileName.toLowerCase()) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const nested = await findFile(fullPath, fileName);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
