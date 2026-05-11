const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pingServer: () => ipcRenderer.invoke('ping-server'),
  ingestFile: (path) => ipcRenderer.invoke('ingest-file', path),
  queryLocalBrain: (query) => ipcRenderer.invoke('query-local-brain', query),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  onBootstrapStatus: (callback) => ipcRenderer.on('bootstrap-status', (event, status) => callback(status)),
  onBootstrapProgress: (callback) => ipcRenderer.on('bootstrap-progress', (event, progress) => callback(progress)),
  onAuthToken: (callback) => ipcRenderer.on('auth-token', (event, token) => callback(token)),
});
