const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let currentFilePath = null;
const configPath = path.join(app.getPath('userData'), 'epochr-config.json');
let promptedAutoOpen = false;

function saveLastOpenedFile(filePath) {
  fs.writeFileSync(configPath, JSON.stringify({ lastFile: filePath }), 'utf-8');
}
function getLastOpenedFile() {
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return data.lastFile;
    } catch { return null; }
  }
  return null;
}

function parseCssVarPx(value, fallback) {
  if (!value) return fallback;
  const match = value.match(/([0-9.]+)px/);
  return match ? parseInt(match[1], 10) : fallback;
}

function getWindowMinSizeFromTheme() {
  try {
    const themePath = path.join(__dirname, 'renderer', 'theme.css');
    const css = fs.readFileSync(themePath, 'utf-8');
    const minWidthMatch = css.match(/--window-min-width:\s*([0-9.]+px)/);
    const minHeightMatch = css.match(/--window-min-height:\s*([0-9.]+px)/);
    const minWidth = parseCssVarPx(minWidthMatch && minWidthMatch[1], 600);
    const minHeight = parseCssVarPx(minHeightMatch && minHeightMatch[1], 400);
    return { minWidth, minHeight };
  } catch {
    return { minWidth: 600, minHeight: 400 };
  }
}

function setContextMenu(win) {
  // Restore native context menu (remove custom logic)
  // No custom context menu event
}

function createWindow() {
  const { minWidth, minHeight } = getWindowMinSizeFromTheme();
  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth,
    minHeight,
    frame: false, // Remove the default title bar
    icon: path.join(__dirname, 'appIcon.png'), // Set app icon
    title: 'Epochr', // Set window title
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  setContextMenu(win);

  win.webContents.on('did-finish-load', async () => {
    if (!promptedAutoOpen && BrowserWindow.getAllWindows().length === 1) {
      const lastFile = getLastOpenedFile();
      if (lastFile && fs.existsSync(lastFile)) {
        const data = fs.readFileSync(lastFile, 'utf-8');
        currentFilePath = lastFile;
        win.webContents.send('board:load', data, lastFile);
        promptedAutoOpen = true;
      }
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  // Restore default menu (remove the line that sets it to null)
  // Menu.setApplicationMenu(null); // <-- Remove or comment out this line
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('board:save', async (event, boardData) => {
  let filePath = currentFilePath;
  const win = BrowserWindow.getFocusedWindow();
  if (!filePath) {
    const { canceled, filePath: savePath } = await dialog.showSaveDialog(win, {
      filters: [{ name: 'Epochr Board', extensions: ['epchr'] }],
      defaultPath: 'board.epchr'
    });
    if (canceled || !savePath) return;
    filePath = savePath;
    currentFilePath = filePath;
  }
  fs.writeFileSync(filePath, boardData, 'utf-8');
  saveLastOpenedFile(filePath);
});

// Also save on load
ipcMain.on('board:loaded', (event, filePath) => {
  saveLastOpenedFile(filePath);
});

ipcMain.on('request:autoopen', (event, filePath) => {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    currentFilePath = filePath;
    event.sender.send('board:load', data, filePath);
  }
});

// IPC handlers for window controls
ipcMain.on('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});
ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// IPC for open board dialog
ipcMain.handle('dialog:openBoard', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Epochr Board', extensions: ['epchr'] }],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const fs = require('fs');
    const data = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { filePath: result.filePaths[0], data };
  }
  return null;
});

// IPC for save board dialog
ipcMain.handle('dialog:saveBoard', async (event, boardData, currentFilePath) => {
  const win = BrowserWindow.getFocusedWindow();
  let filePath = currentFilePath;
  if (!filePath) {
    const result = await dialog.showSaveDialog(win, {
      filters: [{ name: 'Epochr Board', extensions: ['epchr'] }],
      defaultPath: 'board.epchr'
    });
    if (result.canceled || !result.filePath) return null;
    filePath = result.filePath;
  }
  const fs = require('fs');
  fs.writeFileSync(filePath, boardData, 'utf-8');
  return filePath;
});
