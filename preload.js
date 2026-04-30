const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bubbles', {
  getBootstrap: () => ipcRenderer.invoke('app:get-bootstrap'),
  fetchMetadata: (payload) => ipcRenderer.invoke('metadata:fetch', payload),
  saveSettings: (payload) => ipcRenderer.invoke('settings:save', payload),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  selectOutputFolder: () => ipcRenderer.invoke('dialog:select-output-folder'),
  selectInputFile: () => ipcRenderer.invoke('dialog:select-input-file'),
  selectOutputFile: (payload) => ipcRenderer.invoke('dialog:select-output-file', payload),
  startDownload: (payload) => ipcRenderer.invoke('download:start', payload),
  cancelDownload: (downloadId) => ipcRenderer.invoke('download:cancel', downloadId),
  runLocalProcessor: (payload) => ipcRenderer.invoke('processor:run', payload),
  onDownloadProgress: (callback) => ipcRenderer.on('download:progress', (_event, payload) => callback(payload)),
  onDownloadUpdate: (callback) => ipcRenderer.on('download:update', (_event, payload) => callback(payload))
});
