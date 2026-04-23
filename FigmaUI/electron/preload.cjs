const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mdStudio', {
  openFileDialog: () => ipcRenderer.invoke('mdstudio:open-file-dialog'),
  saveFile: (payload) => ipcRenderer.invoke('mdstudio:save-file', payload),
  readFile: (filePath) => ipcRenderer.invoke('mdstudio:read-file', filePath),
  getLaunchFile: () => ipcRenderer.invoke('mdstudio:get-launch-file'),
  onOpenFilePath: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('mdstudio:open-file-path', listener);
    return () => ipcRenderer.removeListener('mdstudio:open-file-path', listener);
  }
});
