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
  try {
    // 키 생성
    const key = new NodeRSA({ b: keySize });
    
    // PEM 형식으로 내보내기 (표준 SPKI/PKCS#8 형식)
    const publicKey = key.exportKey('public');
    const privateKey = key.exportKey('private');
    
    console.log(`RSA 키 생성 완료 - 크기: ${keySize} bits`);
    
    const keyPair: RSAKeyPair = {
      publicKey: publicKey,
      privateKey: privateKey,
      keySize,
      created: new Date(),
    };
    
    return keyPair;
  } catch (error) {
    console.error('키 생성 오류:', error);
    throw new Error(`키 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
});

// 알고리즘 매핑 함수 - PKCS1은 보안상 더 이상 지원되지 않음 (CVE-2023-46809)
const getEncryptionScheme = (algorithm: string): 'pkcs1_oaep' => {
  // Node.js에서 RSA_PKCS1_PADDING이 보안상 비활성화됨
  // 모든 암호화는 OAEP 패딩을 사용
  if (algorithm === 'RSA-PKCS1') {
    console.warn('RSA-PKCS1 패딩은 보안상 지원되지 않습니다. OAEP를 사용합니다.');
  }
  return 'pkcs1_oaep';
};

// Encryption/Decryption
ipcMain.handle(IPC_CHANNELS.ENCRYPT_TEXT, (_, text: string, publicKey: string, algorithm?: string): EncryptionResult => {
  try {
    const selectedAlgorithm = algorithm || 'RSA-OAEP';
    const encryptionScheme = getEncryptionScheme(selectedAlgorithm);
    
    // 공개키로 NodeRSA 인스턴스 생성
    const key = new NodeRSA(publicKey);
    
    // OAEP 패딩 설정 (보안상 PKCS1은 지원되지 않음)
    key.setOptions({ encryptionScheme });
    
    const encrypted = key.encrypt(text, 'base64');
    
    console.log(`암호화 완료 - 요청 알고리즘: ${selectedAlgorithm}, 실제 스킴: ${encryptionScheme}`);
    
    return {
      data: encrypted,
      algorithm: selectedAlgorithm,
      keySize: key.getKeySize(),
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('암호화 오류:', error);
    throw new Error(`암호화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
});

ipcMain.handle(IPC_CHANNELS.DECRYPT_TEXT, (_, encryptedText: string, privateKey: string, algorithm?: string): string => {
  try {
    const selectedAlgorithm = algorithm || 'RSA-OAEP';
    const encryptionScheme = getEncryptionScheme(selectedAlgorithm);
    
    // 개인키로 NodeRSA 인스턴스 생성
    const key = new NodeRSA(privateKey);
    
    // OAEP 패딩 설정 (보안상 PKCS1은 지원되지 않음)
    key.setOptions({ encryptionScheme });
    
    const decrypted = key.decrypt(encryptedText, 'utf8');
    
    console.log(`복호화 완료 - 요청 알고리즘: ${selectedAlgorithm}, 실제 스킴: ${encryptionScheme}`);
    
    return decrypted;
  } catch (error) {
    console.error('복호화 오류:', error);
    throw new Error(`복호화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}. 올바른 키와 알고리즘을 사용했는지 확인해주세요.`);
  }
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