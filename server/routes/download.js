const express = require('express');
const { spawn } = require('child_process');
const { verifyTunnelToken, requireTunnelAccessToken } = require('../security/encryption');
const { assertResolvablePublicHttpUrl } = require('../../src/security');

const router = express.Router();

function getYtDlpPath() {
  return process.env.YT_DLP_PATH || process.env.YT_DLP || 'yt-dlp';
}

router.post('/stream', requireTunnelAccessToken, verifyTunnelToken, async (req, res, next) => {
  try {
    const safeUrl = await assertResolvablePublicHttpUrl(req.body.url);
    if (req.tunnelSession?.url !== safeUrl) {
      throw new Error('Tunnel token URL mismatch.');
    }
    const fileName = String(req.body.fileName || 'download').replace(/[^A-Za-z0-9._ -]/g, '_');
    const audioOnly = Boolean(req.body.audioOnly);
    const formatId = req.body.formatId ? String(req.body.formatId) : null;
    const audioFormat = req.body.audioFormat ? String(req.body.audioFormat) : 'mp3';
    if (req.tunnelSession?.audioOnly !== audioOnly) {
      throw new Error('Tunnel token mode mismatch.');
    }
    if ((req.tunnelSession?.formatId || null) !== formatId) {
      throw new Error('Tunnel token format mismatch.');
    }
    if ((req.tunnelSession?.audioFormat || 'mp3') !== audioFormat) {
      throw new Error('Tunnel token audio format mismatch.');
    }
    const ytDlpPath = getYtDlpPath();
    const args = ['--no-playlist', '--newline', '-o', '-'];

    if (audioOnly) {
      args.push('-x', '--audio-format', audioFormat);
      res.setHeader('content-type', 'audio/mpeg');
      res.setHeader('content-disposition', `attachment; filename="${fileName}.${audioFormat}"`);
    } else {
      if (formatId) {
        args.push('-f', formatId);
      } else {
        args.push('-f', 'bv*+ba/b');
      }
      args.push('--merge-output-format', 'mp4');
      res.setHeader('content-type', 'video/mp4');
      res.setHeader('content-disposition', `attachment; filename="${fileName}.mp4"`);
    }

    args.push(safeUrl);

    // Zero-log policy: requests are processed in memory and the media stream is never written to disk.
    const child = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      next(new Error(`Failed to start yt-dlp: ${error.message}`));
    });

    req.on('close', () => {
      if (!res.writableEnded) {
        child.kill();
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const failure = new Error(stderr.trim() || 'Download stream failed.');
        if (res.headersSent && !res.writableEnded) {
          res.destroy(failure);
          return;
        }
        next(failure);
      }
    });

    child.stdout.on('error', (error) => {
      if (!res.writableEnded) {
        res.destroy(error);
      }
    });

    child.stdout.pipe(res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
