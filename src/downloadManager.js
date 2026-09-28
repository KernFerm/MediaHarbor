const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { spawn } = require('child_process');
const {
  validatePublicUrl,
  sanitizeFileName,
  ensureInsideDirectory,
  resolveOutputDirectory,
  resolveBinary,
  getDefaultDownloadsDir
} = require('./security');
const { requestTunnelStream } = require('./tunnelClient');

class DownloadManager {
  constructor({ settingsStore, historyStore, onProgress, onStateChange }) {
    this.settingsStore = settingsStore;
    this.historyStore = historyStore;
    this.onProgress = onProgress;
    this.onStateChange = onStateChange;
    this.jobs = new Map();
  }

  async startDownload(request) {
    const settings = await this.settingsStore.load();
    const safeUrl = validatePublicUrl(request.url);
    const outputDir = resolveOutputDirectory(settings.outputDir || getDefaultDownloadsDir());

    const id = crypto.randomUUID();
    const displayTitle = buildMediaLabel(request.metadata);
    const title = sanitizeFileName(displayTitle);
    const fileStem = `${title}-${Date.now()}`;
    const audioOnly = Boolean(request.audioOnly);
    const audioFormat = normalizeAudioFormat(request.audioFormat);
    const formatId = request.formatId ? String(request.formatId) : null;
    const forcedTunnel = Boolean(request.forcedTunnel);
    const jobOptions = {
      outputDir,
      fileStem,
      title: displayTitle,
      audioOnly,
      audioFormat,
      formatId,
      backendBaseUrl: request.backendBaseUrl ? String(request.backendBaseUrl) : '',
      backendAccessToken: request.backendAccessToken ? String(request.backendAccessToken) : ''
    };
    const initial = {
      id,
      title: displayTitle,
      status: 'starting',
      cancelled: false,
      percent: '0%',
      speed: 'Pending',
      eta: 'Pending',
      fileName: fileStem
    };

    this.jobs.set(id, initial);
    this.onStateChange({ ...initial, message: 'Download started.' });

    if (forcedTunnel) {
      if (!jobOptions.backendBaseUrl) {
        this.jobs.delete(id);
        throw new Error('Forced tunnel mode needs a backend URL. Use http://127.0.0.1:3467 for local testing or a real HTTPS backend in production.');
      }
      this.runTunnelDownload(id, safeUrl, jobOptions)
        .catch((error) => this.failJob(id, displayTitle, fileStem, outputDir, error));
    } else {
      this.runLocalYtDlp(id, safeUrl, jobOptions)
        .catch((error) => this.failJob(id, displayTitle, fileStem, outputDir, error));
    }

    return { id, message: forcedTunnel ? 'Tunnel download queued.' : 'Local download queued.' };
  }

  async runLocalYtDlp(id, url, options) {
    const ytDlpPath = resolveBinary('yt-dlp');
    const outputTemplate = ensureInsideDirectory(options.outputDir, `${options.fileStem}.%(ext)s`);
    const args = [
      '--newline',
      '--no-playlist',
      '--progress',
      '--output',
      outputTemplate
    ];

    if (options.audioOnly) {
      args.push('--extract-audio', '--audio-format', options.audioFormat || 'mp3');
    } else if (options.formatId) {
      args.push('--format', options.formatId);
    }

    args.push(url);

    const child = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    this.jobs.set(id, { ...this.jobs.get(id), child, status: 'running' });

    child.stdout.on('data', (chunk) => {
      chunk
        .toString()
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => this.consumeProgressLine(id, line));
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', () => {
      if (this.jobs.get(id)?.cancelled) {
        return;
      }
      this.failJob(id, options.title, options.fileStem, options.outputDir, new Error('MediaHarbor could not find yt-dlp. If it was not included with your copy of the app, add yt-dlp and try the download again.'));
    });

    child.on('close', async (code) => {
      if (this.jobs.get(id)?.cancelled) {
        return;
      }
      if (code !== 0) {
        this.failJob(id, options.title, options.fileStem, options.outputDir, new Error(stderr.trim() || 'Download failed.'));
        return;
      }

      const fileName = this.discoverOutputFile(options.outputDir, options.fileStem);
      await this.completeJob(id, {
        title: options.title,
        fileName,
        outputPath: ensureInsideDirectory(options.outputDir, fileName)
      });
    });
  }

  async runTunnelDownload(id, url, options) {
    const extension = options.audioOnly ? (options.audioFormat || 'mp3') : 'mp4';
    const finalFileName = `${options.fileStem}.${extension}`;
    const outputPath = ensureInsideDirectory(options.outputDir, finalFileName);
    const tempOutputPath = ensureInsideDirectory(options.outputDir, `.${options.fileStem}-${crypto.randomUUID()}.part`);
    const controller = new AbortController();
    const response = await requestTunnelStream({
      backendBaseUrl: options.backendBaseUrl,
      backendAccessToken: options.backendAccessToken,
      url,
      formatId: options.formatId,
      audioOnly: options.audioOnly,
      audioFormat: options.audioFormat,
      fileName: options.fileStem,
      signal: controller.signal
    });

    this.jobs.set(id, {
      ...this.jobs.get(id),
      controller,
      status: 'running',
      fileName: finalFileName
    });

    const totalBytes = Number(response.headers.get('content-length')) || 0;
    let writtenBytes = 0;

    try {
      await new Promise((resolve, reject) => {
        const stream = Readable.fromWeb(response.body);
        const target = fs.createWriteStream(tempOutputPath, { flags: 'wx' });
        stream.on('data', (chunk) => {
          writtenBytes += chunk.length;
          const percent = totalBytes ? `${((writtenBytes / totalBytes) * 100).toFixed(1)}%` : 'Streaming';
          this.onProgress({
            id,
            title: options.title,
            fileName: finalFileName,
            percent,
            speed: `${Math.round(writtenBytes / 1024)} KB transferred`,
            eta: totalBytes ? `${Math.max(totalBytes - writtenBytes, 0)} bytes remaining` : 'Unknown',
            status: 'running'
          });
        });
        stream.on('error', reject);
        target.on('error', reject);
        target.on('finish', resolve);
        stream.pipe(target);
      });
      await fsPromises.rename(tempOutputPath, outputPath);
    } catch (error) {
      await fsPromises.unlink(tempOutputPath).catch(() => {});
      throw error;
    }

    await this.completeJob(id, {
      title: options.title,
      fileName: finalFileName,
      outputPath
    });
  }

  consumeProgressLine(id, line) {
    const current = this.jobs.get(id);
    if (!current) {
      return;
    }

    if (line.includes('[download]')) {
      const percentMatch = line.match(/(\d{1,3}\.\d+%|\d{1,3}%)/);
      const speedMatch = line.match(/at\s+([^\s]+\s*[A-Za-z]+\/s)/);
      const etaMatch = line.match(/ETA\s+([0-9:]+)/);
      const payload = {
        id,
        title: current.title,
        fileName: current.fileName,
        percent: percentMatch ? percentMatch[1] : current.percent,
        speed: speedMatch ? speedMatch[1] : current.speed,
        eta: etaMatch ? etaMatch[1] : current.eta,
        status: 'running'
      };
      this.jobs.set(id, { ...current, ...payload });
      this.onProgress(payload);
    }
  }

  discoverOutputFile(outputDir, fileStem) {
    const matches = fs.readdirSync(outputDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.startsWith(`${fileStem}.`))
      .map((entry) => entry.name);
    return matches.sort().at(-1) || fileStem;
  }

  async completeJob(id, { title, fileName, outputPath }) {
    const history = await this.historyStore.append({
      id,
      title,
      fileName,
      outputPath,
      status: 'completed'
    });
    this.jobs.delete(id);
    this.onStateChange({
      id,
      status: 'completed',
      title,
      fileName,
      outputPath,
      history
    });
  }

  async failJob(id, title, fileName, outputDir, error) {
    if (this.jobs.get(id)?.cancelled || error?.name === 'AbortError') {
      return;
    }
    const history = await this.historyStore.append({
      id,
      title,
      fileName,
      outputPath: outputDir,
      status: 'error'
    });
    this.jobs.delete(id);
    this.onStateChange({
      id,
      status: 'error',
      title,
      fileName,
      error: error.message,
      history
    });
  }

  async cancelDownload(id) {
    const job = this.jobs.get(id);
    if (!job) {
      return { success: false, message: 'Download was not active.' };
    }

    this.jobs.set(id, {
      ...job,
      cancelled: true
    });

    if (job.child) {
      job.child.kill();
    }

    if (job.controller) {
      job.controller.abort();
    }

    const history = await this.historyStore.append({
      id,
      title: job.title,
      fileName: job.fileName,
      outputPath: '',
      status: 'cancelled'
    });
    this.jobs.delete(id);
    this.onStateChange({
      id,
      status: 'cancelled',
      title: job.title,
      fileName: job.fileName,
      history
    });
    return { success: true, message: 'Download cancelled.' };
  }

  async shutdown() {
    await Promise.all(Array.from(this.jobs.keys()).map((id) => this.cancelDownload(id)));
  }
}

module.exports = {
  DownloadManager
};

function buildMediaLabel(metadata) {
  const artist = cleanMetadataText(metadata?.artist || metadata?.uploader || metadata?.channel);
  const track = cleanMetadataText(metadata?.track);
  const title = cleanMetadataText(metadata?.title);

  if (artist && track) {
    return `${artist} - ${track}`;
  }

  if (artist && title) {
    return `${artist} - ${title}`;
  }

  return title || artist || 'download';
}

function cleanMetadataText(value) {
  const next = String(value || '').trim();
  return next || '';
}

function normalizeAudioFormat(value) {
  const supportedFormats = new Set(['mp3', 'm4a', 'wav', 'flac', 'opus']);
  const format = String(value || 'mp3').toLowerCase();
  return supportedFormats.has(format) ? format : 'mp3';
}
