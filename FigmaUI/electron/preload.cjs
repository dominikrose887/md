const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mdStudio', {
  openFileDialog: () => ipcRenderer.invoke('mdstudio:open-file-dialog'),
  saveFile: (payload) => ipcRenderer.invoke('mdstudio:save-file', payload),
  readFile: (filePath) => ipcRenderer.invoke('mdstudio:read-file', filePath),
  getLaunchFile: () => ipcRenderer.invoke('mdstudio:get-launch-file'),
  confirmSaveBeforePdf: () => ipcRenderer.invoke('mdstudio:confirm-save-before-pdf'),
  exportPdf: (payload) => ipcRenderer.invoke('mdstudio:export-pdf', payload),
  setCloseState: (payload) => ipcRenderer.send('mdstudio:set-close-state', payload),
  reportCloseSaveResult: (payload) => ipcRenderer.send('mdstudio:close-save-result', payload),
  onCloseSaveRequest: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('mdstudio:close-save-request', listener);
    return () => ipcRenderer.removeListener('mdstudio:close-save-request', listener);
  },
  onOpenFilePath: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('mdstudio:open-file-path', listener);
    return () => ipcRenderer.removeListener('mdstudio:open-file-path', listener);
  }
});
