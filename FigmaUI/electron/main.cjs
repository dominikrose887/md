const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';

let mainWindow = null;
let pendingLaunchFile = null;

function isMarkdownPath(value) {
  if (!value) {
    return false;
  }
  const ext = path.extname(value).toLowerCase();
  return ext === '.md' || ext === '.markdown' || ext === '.mdown';
}

function getMarkdownArg(argv) {
  for (const arg of argv.slice(1)) {
    if (isMarkdownPath(arg)) {
      return path.resolve(arg);
    }
  }
  return null;
}

async function readMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return {
    canceled: false,
    path: filePath,
    name: path.basename(filePath),
    content
  };
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function focusMainWindow() {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

app.on('second-instance', (_event, argv) => {
  const filePath = getMarkdownArg(argv);
  focusMainWindow();
  if (filePath && mainWindow) {
    mainWindow.webContents.send('mdstudio:open-file-path', filePath);
  }
});

app.on('open-file', (event, openPath) => {
  event.preventDefault();
  const resolvedPath = path.resolve(openPath);
  if (mainWindow) {
    mainWindow.webContents.send('mdstudio:open-file-path', resolvedPath);
    focusMainWindow();
  } else {
    pendingLaunchFile = resolvedPath;
  }
});

ipcMain.handle('mdstudio:open-file-dialog', async () => {
  if (!mainWindow) {
    return { canceled: true };
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Markdown File',
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown'] }]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  return readMarkdownFile(result.filePaths[0]);
});

ipcMain.handle('mdstudio:read-file', async (_event, filePath) => {
  if (!filePath) {
    return { canceled: true };
  }
  return readMarkdownFile(filePath);
});

ipcMain.handle('mdstudio:save-file', async (_event, payload) => {
  const { path: targetPath, content, suggestedName } = payload || {};
  let outputPath = targetPath;

  if (!outputPath) {
    if (!mainWindow) {
      return { canceled: true };
    }
    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Markdown File',
      defaultPath: suggestedName || 'document.md',
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown'] }]
    });
    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }
    outputPath = saveResult.filePath;
  }

  await fs.writeFile(outputPath, content ?? '', 'utf8');
  return {
    canceled: false,
    path: outputPath,
    name: path.basename(outputPath)
  };
});

ipcMain.handle('mdstudio:get-launch-file', () => {
  const cliFile = getMarkdownArg(process.argv);
  return pendingLaunchFile || cliFile || null;
});

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
