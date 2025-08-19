import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import NodeRSA from 'node-rsa';
import * as fs from 'fs';
import { AppSettings, RSAKeyPair, EncryptionResult } from '../shared/types';
import { DEFAULT_SETTINGS, IPC_CHANNELS } from '../shared/constants';

const store = new Store({
  defaults: {
    settings: DEFAULT_SETTINGS,
    keys: []
  }
});

let mainWindow: BrowserWindow;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
};

app.whenReady().then(createWindow);

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

// IPC Handlers
ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, (): AppSettings => {
  const settings = store.get('settings', DEFAULT_SETTINGS) as AppSettings;
  
  // Set default paths if empty
  if (!settings.defaultSavePath) {
    settings.defaultSavePath = app.getPath('documents');
  }
  if (!settings.tempPath) {
    settings.tempPath = app.getPath('temp');
  }
  
  return settings;
});

ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, (_, settings: AppSettings): void => {
  store.set('settings', settings);
});

ipcMain.handle(IPC_CHANNELS.GENERATE_RSA_KEYS, (_, keySize: number): RSAKeyPair => {
  const key = new NodeRSA({ b: keySize });
  
  const keyPair: RSAKeyPair = {
    publicKey: key.exportKey('public'),
    privateKey: key.exportKey('private'),
    keySize,
    created: new Date(),
  };
  
  // Store keys
  const keys = store.get('keys', []) as RSAKeyPair[];
  keys.push(keyPair);
  store.set('keys', keys);
  
  return keyPair;
});

ipcMain.handle(IPC_CHANNELS.ENCRYPT_TEXT, (_, text: string, publicKey: string): EncryptionResult => {
  const key = new NodeRSA(publicKey);
  const encrypted = key.encrypt(text, 'base64');
  
  return {
    data: encrypted,
    algorithm: 'RSA',
    keySize: key.getKeySize(),
    timestamp: new Date(),
  };
});

ipcMain.handle(IPC_CHANNELS.DECRYPT_TEXT, (_, encryptedText: string, privateKey: string): string => {
  const key = new NodeRSA(privateKey);
  return key.decrypt(encryptedText, 'utf8');
});

ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(IPC_CHANNELS.SELECT_FILE, async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(IPC_CHANNELS.EXPORT_SETTINGS, async (): Promise<boolean> => {
  const settings = store.get('settings', DEFAULT_SETTINGS) as AppSettings;
  const keys = store.get('keys', []) as RSAKeyPair[];
  
  const exportData = { settings, keys };
  
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'risa-settings.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to export settings:', error);
      return false;
    }
  }
  
  return false;
});

ipcMain.handle(IPC_CHANNELS.IMPORT_SETTINGS, async (): Promise<boolean> => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile'],
  });
  
  if (!result.canceled && result.filePaths[0]) {
    try {
      const data = fs.readFileSync(result.filePaths[0], 'utf8');
      const importData = JSON.parse(data);
      
      if (importData.settings) {
        store.set('settings', importData.settings);
      }
      if (importData.keys) {
        store.set('keys', importData.keys);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }
  
  return false;
});