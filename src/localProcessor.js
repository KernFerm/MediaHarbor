const { spawn } = require('child_process');
const { resolveBinary } = require('./security');

function processMediaLocally({ inputPath, outputPath, mode }) {
  const ffmpegPath = resolveBinary('ffmpeg');
  const normalizedOutputPath = normalizeOutputPath(outputPath, mode);
  let args;

  if (mode === 'extract-audio') {
    args = ['-y', '-i', inputPath, '-vn', '-c:a', 'libmp3lame', normalizedOutputPath];
  } else if (mode === 'remux-mp4') {
    args = ['-y', '-i', inputPath, '-c', 'copy', normalizedOutputPath];
  } else {
    args = ['-y', '-i', inputPath, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', normalizedOutputPath];
  }

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true
    });

    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', () => {
      reject(new Error('MediaHarbor could not find ffmpeg. If it was not included with your copy of the app, install ffmpeg and try again.'));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(toFriendlyProcessingError(stderr) || 'Local processing failed.'));
        return;
      }

      resolve({
        success: true,
        message: `Local processing completed successfully: ${normalizedOutputPath}`
      });
    });
  });
}

function normalizeOutputPath(outputPath, mode) {
  const expectedExtension = mode === 'extract-audio' ? 'mp3' : 'mp4';

  if (!outputPath) {
    return outputPath;
  }

  if (/\.[^./\\]+$/.test(outputPath)) {
    return outputPath.replace(/\.[^./\\]+$/, `.${expectedExtension}`);
  }

  return `${outputPath}.${expectedExtension}`;
}

function toFriendlyProcessingError(stderr) {
  const message = String(stderr || '').trim();

  if (!message) {
    return '';
  }

  if (message.includes('Could not write header') || message.includes('Invalid argument')) {
    return 'The selected save file type did not match the processing mode. MediaHarbor now expects .mp3 for Extract audio and .mp4 for video processing.';
  }

  return message;
}

module.exports = {
  processMediaLocally
};
