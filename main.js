const path = require('path');
const fs = require('fs/promises');
const { app, BrowserWindow, ipcMain, dialog, nativeTheme, shell, Menu } = require('electron');
const dotenv = require('dotenv');

dotenv.config();

const { DownloadManager } = require('./src/downloadManager');
const { fetchMetadata } = require('./src/metadata');
const { SettingsStore, DEFAULT_SETTINGS } = require('./src/settings');
const { HistoryStore } = require('./src/history');
const { processMediaLocally } = require('./src/localProcessor');
const { isSafeExternalUrl } = require('./src/security');

let mainWindow;
let backendProcess = null;
const isDevelopment = process.env.NODE_ENV !== 'production';

const settingsStore = new SettingsStore(app);
const historyStore = new HistoryStore(app);
const downloadManager = new DownloadManager({
  app,
  settingsStore,
  historyStore,
  onProgress: (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:progress', payload);
    }
  },
  onStateChange: (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:update', payload);
    }
  }
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function openDocumentWindow({ title, filePath }) {
  const rawText = await fs.readFile(filePath, 'utf8');
  return openTextWindow({ title, rawText });
}

async function openTextWindow({ title, rawText }) {
  const documentWindow = new BrowserWindow({
    width: 920,
    height: 760,
    minWidth: 720,
    minHeight: 560,
      title,
      backgroundColor: '#08131a',
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; object-src 'none'; base-uri 'none'">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #071117;
      --panel: rgba(8, 18, 23, 0.96);
      --border: rgba(121, 204, 227, 0.16);
      --text: #ebf8fc;
      --muted: #97b2bc;
      --accent: #4fd1c5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(79, 209, 197, 0.18), transparent 28%),
        linear-gradient(145deg, var(--bg), #0d1f27 48%, #08131a);
    }
    .shell {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
    }
    .panel {
      border: 1px solid var(--border);
      border-radius: 22px;
      background: var(--panel);
      padding: 24px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.8rem;
    }
    p {
      margin: 0 0 18px;
      color: var(--muted);
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.55;
      font-family: Consolas, "Cascadia Code", monospace;
      font-size: 0.95rem;
      color: var(--text);
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="panel">
      <h1>${escapeHtml(title)}</h1>
      <p>Opened inside MediaHarbor.</p>
      <pre>${escapeHtml(rawText)}</pre>
    </div>
  </div>
</body>
</html>`;

  await documentWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function getShortcutGuide() {
  const modifier = process.platform === 'darwin' ? 'Cmd' : 'Ctrl';
  return [
    'MediaHarbor Keyboard Shortcuts',
    '',
    `${modifier}+L  Focus the public link box`,
    `${modifier}+V  Paste into the selected field`,
    `${modifier}+C  Copy selected text`,
    `${modifier}+A  Select all text in the current field`,
    'Right-click  Open the edit menu for paste, copy, and more',
    '',
    'Tip: Use the Help menu any time you want to see this list again.'
  ].join('\n');
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Output Folder',
          click: async () => {
            const settings = await settingsStore.load();
            if (settings.outputDir) {
              shell.openPath(settings.outputDir);
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            openTextWindow({
              title: 'Keyboard Shortcuts',
              rawText: getShortcutGuide()
            }).catch(() => {});
          }
        },
        {
          label: 'Project README',
          click: () => {
            openDocumentWindow({
              title: 'Project README',
              filePath: path.join(__dirname, 'README.md')
            }).catch(() => {});
          }
        },
        {
          label: 'Privacy and Legal Notes',
          click: () => {
            openDocumentWindow({
              title: 'Privacy and Legal Notes',
              filePath: path.join(__dirname, 'build', 'Privacy and Data Collection.txt')
            }).catch(() => {});
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function attachContextMenu(window) {
  window.webContents.on('context-menu', (_event, params) => {
    const template = [];

    if (params.isEditable) {
      template.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      );
    } else if (params.selectionText?.trim()) {
      template.push(
        { role: 'copy' },
        { type: 'separator' },
        { role: 'selectAll' }
      );
    }

    if (template.length === 0) {
      return;
    }

    Menu.buildFromTemplate(template).popup({
      window
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1100,
    minHeight: 760,
    show: false,
    backgroundColor: '#08131a',
    title: 'MediaHarbor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: isDevelopment
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      }
    }
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    if (details.url.startsWith('data:text/html')) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    const headers = {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; img-src 'self' data: https:; style-src 'self'; script-src 'self'; connect-src 'self' https: http://127.0.0.1:* http://localhost:*; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'"
      ],
      'X-Content-Type-Options': ['nosniff']
    };
    callback({ responseHeaders: headers });
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  attachContextMenu(mainWindow);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function maybeStartBundledBackend() {
  if (process.env.BUBBLES_START_LOCAL_BACKEND !== 'true') {
    return;
  }

  const { fork } = require('child_process');
  const serverEntry = path.join(__dirname, 'server', 'server.js');
  backendProcess = fork(serverEntry, [], {
    env: {
      ...process.env,
      APP_PORT: process.env.LOCAL_BACKEND_PORT || process.env.APP_PORT || '3467'
    },
    silent: !isDevelopment
  });
}

app.whenReady().then(() => {
  buildAppMenu();
  createWindow();
  maybeStartBundledBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await downloadManager.shutdown();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await downloadManager.shutdown();
  if (backendProcess) {
    backendProcess.kill();
  }
});

ipcMain.handle('app:get-bootstrap', async () => {
  const settings = await settingsStore.load();
  const history = await historyStore.list();
  return {
    appName: 'MediaHarbor',
    version: app.getVersion(),
    settings,
    history,
    theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    defaults: DEFAULT_SETTINGS
  };
});

ipcMain.handle('dialog:select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('dialog:select-input-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Media files', extensions: ['mp4', 'mkv', 'mov', 'webm', 'mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('dialog:select-output-file', async (_event, payload) => {
  const mode = payload?.mode;
  const filters =
    mode === 'extract-audio'
      ? [
          { name: 'MP3 audio', extensions: ['mp3'] },
          { name: 'All files', extensions: ['*'] }
        ]
      : [
          { name: 'MP4 video', extensions: ['mp4'] },
          { name: 'All files', extensions: ['*'] }
        ];

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: payload?.defaultPath || undefined,
    filters
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return result.filePath;
});

ipcMain.handle('metadata:fetch', async (_event, payload) => {
  return fetchMetadata(payload);
});

ipcMain.handle('settings:save', async (_event, partialSettings) => {
  return settingsStore.save(partialSettings);
});

ipcMain.handle('history:clear', async () => {
  await historyStore.clear();
  return [];
});

ipcMain.handle('download:start', async (_event, request) => {
  return downloadManager.startDownload(request);
});

ipcMain.handle('download:cancel', async (_event, downloadId) => {
  return downloadManager.cancelDownload(downloadId);
});

ipcMain.handle('processor:run', async (_event, payload) => {
  return processMediaLocally(payload);
});
