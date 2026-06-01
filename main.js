const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Data persistence
const dataPath = path.join(app.getPath('userData'), 'pomochick-data.json');

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
  } catch (e) {}
  return {
    totalFocusMinutes: 0,
    dailyBlocks: {},
    settings: {
      pomoDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      pomosPerSession: 4,
      hungerDecrease: 10
    }
  };
}

function saveData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (e) {}
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 407,
    height: 466,
    useContentSize: true,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1d1b16'
  });

  mainWindow.loadFile('index.html');
  // Window is shown manually by renderer after init completes
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.handle('load-data', () => loadData());
ipcMain.handle('save-data', (event, data) => { saveData(data); return true; });

ipcMain.handle('send-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
  return true;
});

ipcMain.on('close-window', () => mainWindow.close());
ipcMain.on('minimize-window', () => mainWindow.minimize());
ipcMain.on('show-window', () => mainWindow.show());
