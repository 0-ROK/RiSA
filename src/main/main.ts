import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import NodeRSA from 'node-rsa';
import * as fs from 'fs';
import { SavedKey, RSAKeyPair, EncryptionResult } from '../shared/types';
import { IPC_CHANNELS } from '../shared/constants';

const store = new Store({
  defaults: {
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

// Key management
ipcMain.handle(IPC_CHANNELS.GET_SAVED_KEYS, (): SavedKey[] => {
  return store.get('keys', []) as SavedKey[];
});

ipcMain.handle(IPC_CHANNELS.SAVE_KEY, (_, key: SavedKey): void => {
  const keys = store.get('keys', []) as SavedKey[];
  keys.push(key);
  store.set('keys', keys);
});

ipcMain.handle(IPC_CHANNELS.DELETE_KEY, (_, keyId: string): void => {
  const keys = store.get('keys', []) as SavedKey[];
  const filteredKeys = keys.filter(k => k.id !== keyId);
  store.set('keys', filteredKeys);
});

ipcMain.handle(IPC_CHANNELS.GENERATE_RSA_KEYS, (_, keySize: number): RSAKeyPair => {
  const key = new NodeRSA({ b: keySize });
  
  const keyPair: RSAKeyPair = {
    publicKey: key.exportKey('public'),
    privateKey: key.exportKey('private'),
    keySize,
    created: new Date(),
  };
  
  return keyPair;
});

// Encryption/Decryption
ipcMain.handle(IPC_CHANNELS.ENCRYPT_TEXT, (_, text: string, publicKey: string, algorithm?: string): EncryptionResult => {
  const key = new NodeRSA(publicKey);
  const encrypted = key.encrypt(text, 'base64');
  
  return {
    data: encrypted,
    algorithm: algorithm || 'RSA-OAEP',
    keySize: key.getKeySize(),
    timestamp: new Date(),
  };
});

ipcMain.handle(IPC_CHANNELS.DECRYPT_TEXT, (_, encryptedText: string, privateKey: string, algorithm?: string): string => {
  const key = new NodeRSA(privateKey);
  return key.decrypt(encryptedText, 'utf8');
});

// File operations
ipcMain.handle(IPC_CHANNELS.SELECT_FILE, async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(IPC_CHANNELS.EXPORT_KEY, async (_, key: SavedKey): Promise<boolean> => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${key.name}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, JSON.stringify(key, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to export key:', error);
      return false;
    }
  }
  
  return false;
});

ipcMain.handle(IPC_CHANNELS.IMPORT_KEY, async (): Promise<SavedKey | null> => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile'],
  });
  
  if (!result.canceled && result.filePaths[0]) {
    try {
      const data = fs.readFileSync(result.filePaths[0], 'utf8');
      const importedKey = JSON.parse(data) as SavedKey;
      
      // Validate key structure
      if (importedKey.id && importedKey.name && importedKey.publicKey && importedKey.privateKey) {
        return importedKey;
      } else {
        throw new Error('Invalid key file format');
      }
    } catch (error) {
      console.error('Failed to import key:', error);
      return null;
    }
  }
  
  return null;
});