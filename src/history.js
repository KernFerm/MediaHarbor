const fs = require('fs/promises');
const path = require('path');
const { ensureDirectory } = require('./security');

class HistoryStore {
  constructor(app) {
    this.filePath = path.join(app.getPath('userData'), 'history.json');
  }

  async list() {
    ensureDirectory(path.dirname(this.filePath));
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async append(entry) {
    const history = await this.list();
    history.push({
      id: entry.id,
      title: entry.title,
      fileName: entry.fileName,
      outputPath: entry.outputPath,
      status: entry.status,
      savedAt: new Date().toISOString()
    });
    await fs.writeFile(this.filePath, JSON.stringify(history.slice(-200), null, 2), 'utf8');
    return history.slice(-200);
  }

  async clear() {
    await fs.writeFile(this.filePath, '[]', 'utf8');
  }
}

module.exports = {
  HistoryStore
};
