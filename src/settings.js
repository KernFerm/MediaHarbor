const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { encryptJson, decryptJson, getLegacyFallbackSecret } = require('./encryption');
const { ensureDirectory, getDefaultDownloadsDir, validateBackendBaseUrl } = require('./security');

const DEFAULT_SETTINGS = {
  outputDir: getDefaultDownloadsDir(),
  audioFormat: 'mp3',
  backendBaseUrl: process.env.BACKEND_BASE_URL
    ? validateBackendBaseUrl(process.env.BACKEND_BASE_URL)
    : 'http://127.0.0.1:3467',
  backendAccessToken: process.env.BACKEND_ACCESS_TOKEN || '',
  forceTunnel: process.env.FORCED_TUNNEL_DEFAULT === 'true',
  theme: 'dark',
  onboardingDismissed: false,
  advancedMode: false
};

class SettingsStore {
  constructor(app) {
    this.app = app;
    this.filePath = path.join(app.getPath('userData'), 'settings.enc.json');
    this.secretFilePath = path.join(app.getPath('userData'), 'settings.key');
    this.secretPromise = null;
  }

  async load() {
    ensureDirectory(path.dirname(this.filePath));
    const secret = await this.getEncryptionSecret();
    try {
      const encrypted = await fs.readFile(this.filePath, 'utf8');
      try {
        const parsed = decryptJson(encrypted, secret);
        return mergeSettings(parsed);
      } catch {
        const parsed = decryptJson(encrypted, getLegacyFallbackSecret());
        await fs.writeFile(this.filePath, encryptJson(parsed, secret), 'utf8');
        return mergeSettings(parsed);
      }
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async save(partialSettings) {
    const current = await this.load();
    const next = { ...current, ...partialSettings };
    if (next.backendBaseUrl) {
      next.backendBaseUrl = validateBackendBaseUrl(next.backendBaseUrl);
    }
    ensureDirectory(path.dirname(this.filePath));
    const secret = await this.getEncryptionSecret();
    await fs.writeFile(this.filePath, encryptJson(next, secret), 'utf8');
    return next;
  }

  async getEncryptionSecret() {
    if (!this.secretPromise) {
      this.secretPromise = this.loadOrCreateEncryptionSecret();
    }

    return this.secretPromise;
  }

  async loadOrCreateEncryptionSecret() {
    ensureDirectory(path.dirname(this.secretFilePath));

    try {
      const existing = (await fs.readFile(this.secretFilePath, 'utf8')).trim();
      if (existing) {
        return existing;
      }
    } catch {
      // Generate a new per-install secret below.
    }

    const generated = crypto.randomBytes(32).toString('base64url');
    await fs.writeFile(this.secretFilePath, `${generated}\n`, 'utf8');
    return generated;
  }
}

function mergeSettings(parsed) {
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    backendBaseUrl: parsed?.backendBaseUrl || DEFAULT_SETTINGS.backendBaseUrl,
    backendAccessToken: parsed?.backendAccessToken || DEFAULT_SETTINGS.backendAccessToken
  };
}

module.exports = {
  SettingsStore,
  DEFAULT_SETTINGS
};
