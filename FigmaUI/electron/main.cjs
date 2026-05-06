const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');

const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';

let mainWindow = null;
let pendingLaunchFile = null;
let saveWindowStateTimer = null;
let isClosingAllowed = false;
const WINDOW_STATE_FILE = 'window-state.json';
const DEFAULT_WINDOW_BOUNDS = { width: 1400, height: 900 };
const closeStateByWebContentsId = new Map();
const pendingCloseSaveRequests = new Map();
const fileWatchersByKey = new Map();
const watchedPathsByWebContentsId = new Map();

function getWindowStateFilePath() {
  return path.join(app.getPath('userData'), WINDOW_STATE_FILE);
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidBounds(bounds) {
  return !!bounds
    && isNumber(bounds.width)
    && isNumber(bounds.height)
    && isNumber(bounds.x)
    && isNumber(bounds.y)
    && bounds.width >= 960
    && bounds.height >= 640;
}

function isBoundsVisible(bounds) {
  const pointToCheck = {
    x: bounds.x + Math.floor(bounds.width / 2),
    y: bounds.y + Math.floor(bounds.height / 2)
  };
  return !!screen.getDisplayNearestPoint(pointToCheck);
}

async function readWindowState() {
  try {
    const raw = await fsPromises.readFile(getWindowStateFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (!isValidBounds(parsed.bounds) || !isBoundsVisible(parsed.bounds)) {
      return null;
    }
    return {
      bounds: parsed.bounds,
      isMaximized: Boolean(parsed.isMaximized),
      isFullScreen: Boolean(parsed.isFullScreen)
    };
  } catch {
    return null;
  }
}

async function writeWindowState(win) {
  if (!win || win.isDestroyed()) {
    return;
  }
  const state = {
    bounds: win.isMaximized() || win.isFullScreen() ? win.getNormalBounds() : win.getBounds(),
    isMaximized: win.isMaximized(),
    isFullScreen: win.isFullScreen()
  };
  try {
    await fsPromises.writeFile(getWindowStateFilePath(), JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('mdstudio:save-window-state', err);
  }
}

function scheduleWindowStateSave(win) {
  if (saveWindowStateTimer) {
    clearTimeout(saveWindowStateTimer);
  }
  saveWindowStateTimer = setTimeout(() => {
    saveWindowStateTimer = null;
    void writeWindowState(win);
  }, 200);
}

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
  const content = await fsPromises.readFile(filePath, 'utf8');
  const stat = await fsPromises.stat(filePath);
  return {
    canceled: false,
    path: filePath,
    name: path.basename(filePath),
    content,
    version: `${stat.mtimeMs}:${stat.size}`
  };
}

function watchKey(webContentsId, filePath) {
  return `${webContentsId}:${filePath}`;
}

function clearWatchersForWebContents(webContentsId) {
  const watched = watchedPathsByWebContentsId.get(webContentsId);
  if (!watched) {
    return;
  }
  for (const watchedPath of watched) {
    const key = watchKey(webContentsId, watchedPath);
    const entry = fileWatchersByKey.get(key);
    if (!entry) {
      continue;
    }
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    entry.watcher.close();
    fileWatchersByKey.delete(key);
  }
  watchedPathsByWebContentsId.delete(webContentsId);
}

async function createWindow() {
  const savedState = await readWindowState();
  const initialBounds = savedState?.bounds ?? DEFAULT_WINDOW_BOUNDS;
  const win = new BrowserWindow({
    title: 'MD Studio',
    width: initialBounds.width,
    height: initialBounds.height,
    x: savedState?.bounds?.x,
    y: savedState?.bounds?.y,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow = win;
  const webContentsId = win.webContents.id;

  if (isDev) {
    await win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'));
  }

  if (savedState?.isMaximized) {
    win.maximize();
  }
  if (savedState?.isFullScreen) {
    win.setFullScreen(true);
  }

  win.on('resize', () => scheduleWindowStateSave(win));
  win.on('move', () => scheduleWindowStateSave(win));
  win.on('maximize', () => scheduleWindowStateSave(win));
  win.on('unmaximize', () => scheduleWindowStateSave(win));
  win.on('enter-full-screen', () => scheduleWindowStateSave(win));
  win.on('leave-full-screen', () => scheduleWindowStateSave(win));
  win.on('close', async (event) => {
    void writeWindowState(win);
    if (isClosingAllowed || win.isDestroyed()) {
      return;
    }
    const closeState = closeStateByWebContentsId.get(webContentsId);
    if (!closeState?.hasUnsavedChanges) {
      return;
    }

    event.preventDefault();

    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved Changes',
      message: 'Do you want to quit without saving?',
      detail: closeState.fileName
        ? `Your changes in "${closeState.fileName}" will be lost.`
        : 'Your changes in the current document will be lost.'
    });

    if (response === 2) {
      return;
    }

    if (response === 0) {
      const mode = closeState.canOverwrite ? 'save' : 'saveAs';
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const saveSucceeded = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pendingCloseSaveRequests.delete(requestId);
          resolve(false);
        }, 60000);
        pendingCloseSaveRequests.set(requestId, (success) => {
          clearTimeout(timeout);
          pendingCloseSaveRequests.delete(requestId);
          resolve(Boolean(success));
        });
        if (win.isDestroyed()) {
          pendingCloseSaveRequests.delete(requestId);
          clearTimeout(timeout);
          resolve(false);
          return;
        }
        win.webContents.send('mdstudio:close-save-request', { requestId, mode });
      });
      if (!saveSucceeded) {
        return;
      }
    }

    isClosingAllowed = true;
    if (!win.isDestroyed()) {
      win.close();
    }
  });
  win.on('closed', () => {
    clearWatchersForWebContents(webContentsId);
    closeStateByWebContentsId.delete(webContentsId);
    mainWindow = null;
    isClosingAllowed = false;
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
  const { path: targetPath, content, suggestedName, expectedVersion } = payload || {};
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

  if (expectedVersion && outputPath) {
    try {
      const existingStat = await fsPromises.stat(outputPath);
      const currentVersion = `${existingStat.mtimeMs}:${existingStat.size}`;
      if (currentVersion !== expectedVersion) {
        const currentContent = await fsPromises.readFile(outputPath, 'utf8');
        return {
          canceled: true,
          conflict: true,
          path: outputPath,
          name: path.basename(outputPath),
          content: currentContent,
          version: currentVersion
        };
      }
    } catch {
      // File might not exist yet. In that case proceed with write.
    }
  }

  await fsPromises.writeFile(outputPath, content ?? '', 'utf8');
  const updatedStat = await fsPromises.stat(outputPath);
  return {
    canceled: false,
    path: outputPath,
    name: path.basename(outputPath),
    version: `${updatedStat.mtimeMs}:${updatedStat.size}`
  };
});

ipcMain.handle('mdstudio:watch-file', (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return { ok: false };
  }
  const senderId = event.sender.id;
  const key = watchKey(senderId, filePath);
  if (fileWatchersByKey.has(key)) {
    return { ok: true };
  }
  try {
    const watcher = fs.watch(filePath, { persistent: false }, () => {
      const entry = fileWatchersByKey.get(key);
      if (!entry) {
        return;
      }
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      entry.timer = setTimeout(() => {
        if (!entry.webContents.isDestroyed()) {
          entry.webContents.send('mdstudio:file-changed', { path: filePath });
        }
      }, 200);
    });
    watcher.on('error', () => {
      const entry = fileWatchersByKey.get(key);
      if (!entry) {
        return;
      }
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      fileWatchersByKey.delete(key);
      const watched = watchedPathsByWebContentsId.get(senderId);
      if (watched) {
        watched.delete(filePath);
        if (watched.size === 0) {
          watchedPathsByWebContentsId.delete(senderId);
        }
      }
    });
    fileWatchersByKey.set(key, {
      watcher,
      timer: null,
      webContents: event.sender
    });
    const watched = watchedPathsByWebContentsId.get(senderId) ?? new Set();
    watched.add(filePath);
    watchedPathsByWebContentsId.set(senderId, watched);
    return { ok: true };
  } catch {
    return { ok: false };
  }
});

ipcMain.handle('mdstudio:unwatch-file', (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return { ok: false };
  }
  const senderId = event.sender.id;
  const key = watchKey(senderId, filePath);
  const entry = fileWatchersByKey.get(key);
  if (!entry) {
    return { ok: true };
  }
  if (entry.timer) {
    clearTimeout(entry.timer);
  }
  entry.watcher.close();
  fileWatchersByKey.delete(key);
  const watched = watchedPathsByWebContentsId.get(senderId);
  if (watched) {
    watched.delete(filePath);
    if (watched.size === 0) {
      watchedPathsByWebContentsId.delete(senderId);
    }
  }
  return { ok: true };
});

ipcMain.handle('mdstudio:get-launch-file', () => {
  const cliFile = getMarkdownArg(process.argv);
  return pendingLaunchFile || cliFile || null;
});

ipcMain.handle('mdstudio:confirm-save-before-pdf', async () => {
  if (!mainWindow) {
    return 2;
  }
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Save', "Don't save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Export PDF',
    message: 'Do you want to save the document before exporting to PDF?',
    detail: 'The PDF will reflect saved content. Unsaved edits are only included if you save first.'
  });
  return response;
});

ipcMain.handle('mdstudio:export-pdf', async (_event, payload) => {
  const suggestedFileName = (payload && payload.suggestedFileName) || 'document.pdf';
  if (!mainWindow) {
    return { canceled: true };
  }
  try {
    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      marginsType: 0
    });
    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Export PDF',
      defaultPath: suggestedFileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }
    await fsPromises.writeFile(saveResult.filePath, data);
    return { canceled: false, path: saveResult.filePath };
  } catch (err) {
    console.error('mdstudio:export-pdf', err);
    return { canceled: true, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.on('mdstudio:set-close-state', (event, payload) => {
  closeStateByWebContentsId.set(event.sender.id, {
    hasUnsavedChanges: Boolean(payload?.hasUnsavedChanges),
    fileName: typeof payload?.fileName === 'string' ? payload.fileName : '',
    canOverwrite: Boolean(payload?.canOverwrite)
  });
});

ipcMain.on('mdstudio:close-save-result', (_event, payload) => {
  const requestId = payload?.requestId;
  const notify = requestId ? pendingCloseSaveRequests.get(requestId) : null;
  if (!notify) {
    return;
  }
  notify(Boolean(payload?.success));
});

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.setName('MD Studio');
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.rose.mdstudio');
  }
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
