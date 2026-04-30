const fs = require('fs/promises');
const path = require('path');
const { encryptJson, decryptJson } = require('./encryption');
const { ensureDirectory, getDefaultDownloadsDir, validateBackendBaseUrl } = require('./security');

const DEFAULT_SETTINGS = {
  outputDir: getDefaultDownloadsDir(),
  audioFormat: 'mp3',
  backendBaseUrl: process.env.BACKEND_BASE_URL ? validateBackendBaseUrl(process.env.BACKEND_BASE_URL) : '',
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
  }

  async load() {
    ensureDirectory(path.dirname(this.filePath));
    try {
      const encrypted = await fs.readFile(this.filePath, 'utf8');
      const parsed = decryptJson(encrypted);
      return { ...DEFAULT_SETTINGS, ...parsed };
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
    await fs.writeFile(this.filePath, encryptJson(next), 'utf8');
    return next;
  }
}

module.exports = {
  SettingsStore,
  DEFAULT_SETTINGS
};
