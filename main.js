const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

const { initEngine, ingestFile, queryHenry } = require('./engine');

// Register the custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('nedai', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('nedai');
}

let mainWindow;
let pendingToken = null;

function handleDeepLink(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol === 'nedai:' && parsedUrl.hostname === 'auth') {
    const token = parsedUrl.searchParams.get('token');
    if (token) {
      if (mainWindow) {
        mainWindow.webContents.send('auth-token', token);
      } else {
        pendingToken = token;
      }
    }
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    
    // On Windows, the deep link URL is passed in the command line
    const url = commandLine.pop();
    if (url.startsWith('nedai://')) {
      handleDeepLink(url);
    }
  });
}

// Bootstrapper: Ensure local models are ready
async function bootstrapModels(window) {
  return new Promise((resolve) => {
    console.log('[Bootstrapper] Checking for Phi-3 Mini...');
    
    // Check if phi3 is already pulled
    exec('ollama list', (err, stdout) => {
      if (err) {
        console.error('[Bootstrapper] Ollama not found or not running.');
        window.webContents.send('bootstrap-status', 'error-no-ollama');
        return resolve(false);
      }

      if (stdout.includes('phi3')) {
        console.log('[Bootstrapper] Phi-3 Mini found.');
        window.webContents.send('bootstrap-status', 'ready');
        return resolve(true);
      }

      // Model missing, start pulling
      console.log('[Bootstrapper] Phi-3 Mini missing. Pulling now...');
      window.webContents.send('bootstrap-status', 'pulling');
      
      const pullProcess = spawn('ollama', ['pull', 'phi3:mini']);
      
      pullProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // Ollama sends progress to stdout or stderr depending on version/terminal
        // Look for percentages like "50%"
        const match = output.match(/(\d+)%/);
        if (match) {
          window.webContents.send('bootstrap-progress', parseInt(match[1]));
        }
      });

      pullProcess.stderr.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/(\d+)%/);
        if (match) {
          window.webContents.send('bootstrap-progress', parseInt(match[1]));
        }
      });
      
      pullProcess.on('close', (code) => {
        if (code === 0) {
          console.log('[Bootstrapper] Phi-3 Mini pulled successfully.');
          window.webContents.send('bootstrap-status', 'ready');
          resolve(true);
        } else {
          window.webContents.send('bootstrap-status', 'error-pull-failed');
          resolve(false);
        }
      });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#ffffff',
    },
  });

  // Initialize the Local Brain (Henry)
  initEngine(app.getPath('userData')).then(() => {
    bootstrapModels(mainWindow);
  }).catch(console.error);

  // In development, load from Vite dev server
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, 'web/dist/index.html'));
    mainWindow.webContents.openDevTools();
  }

  // Ensure external links open in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      require('electron').shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // If we have a pending token from launch, send it once ready
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingToken) {
      mainWindow.webContents.send('auth-token', pendingToken);
      pendingToken = null;
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Handle deep link on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for Phase 2 & 3
ipcMain.handle('ping-server', async () => {
  return true;
});

ipcMain.handle('ingest-file', async (event, filePath) => {
  try {
    return await ingestFile(filePath);
  } catch (e) {
    console.error('Ingestion error:', e);
    return { error: e.message };
  }
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'docx', 'doc'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return {
    path: result.filePaths[0],
    name: path.basename(result.filePaths[0])
  };
});

ipcMain.handle('query-local-brain', async (event, query) => {
  try {
    return await queryHenry(query);
  } catch (e) {
    console.error('Query error:', e);
    return "";
  }
});
