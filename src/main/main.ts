import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import NodeRSA from 'node-rsa';
import * as forge from 'node-forge';
import * as fs from 'fs';
import { autoUpdater } from 'electron-updater';
import { SavedKey, RSAKeyPair, EncryptionResult, HistoryItem, HistoryFilter } from '../shared/types';
import { IPC_CHANNELS } from '../shared/constants';

// Type-safe store interface
interface StoreData {
  keys: SavedKey[];
  history: HistoryItem[];
}

const store = new Store({
  defaults: {
    keys: [] as SavedKey[],
    history: [] as HistoryItem[]
  }
});

// Type-safe store methods
const storeGet = <K extends keyof StoreData>(key: K, defaultValue: StoreData[K]): StoreData[K] => {
  return (store as unknown as { get(key: K, defaultValue: StoreData[K]): StoreData[K] }).get(key, defaultValue);
};

const storeSet = <K extends keyof StoreData>(key: K, value: StoreData[K]): void => {
  (store as unknown as { set(key: K, value: StoreData[K]): void }).set(key, value);
};

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

// Auto Updater 설정
const setupAutoUpdater = (): void => {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: '0-ROK',
    repo: 'RiSA'
  });

  // 업데이트 확인
  autoUpdater.checkForUpdatesAndNotify();

  // 업데이트 이벤트 리스너
  autoUpdater.on('checking-for-update', () => {
    console.log('업데이트 확인 중...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('업데이트 사용 가능:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('최신 버전입니다:', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('업데이트 오류:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = `다운로드 속도: ${progressObj.bytesPerSecond}`;
    logMessage = logMessage + ` - 다운로드 ${progressObj.percent}%`;
    logMessage = logMessage + ` (${progressObj.transferred}/${progressObj.total})`;
    console.log(logMessage);

    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('업데이트 다운로드 완료:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });
};

// 메뉴 설정
const setupMenu = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'RiSA',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: '업데이트 확인',
          click: () => {
            autoUpdater.checkForUpdatesAndNotify();
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '창',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    // macOS에서는 첫 번째 메뉴를 앱 이름으로 설정
    template[0].label = app.getName();
    (template[0].submenu as Electron.MenuItemConstructorOptions[])[0] = { role: 'about', label: `${app.getName()} 정보` };

    // 창 메뉴에 macOS 특화 옵션 추가
    (template[3].submenu as Electron.MenuItemConstructorOptions[]).push(
      { type: 'separator' },
      { role: 'front' }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  createWindow();

  // Auto updater 설정
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    setupAutoUpdater();
  }

  // 메뉴 설정
  setupMenu();
});

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
  return storeGet('keys', []);
});

ipcMain.handle(IPC_CHANNELS.SAVE_KEY, (_, key: SavedKey): void => {
  const keys = storeGet('keys', []);
  keys.push(key);
  storeSet('keys', keys);
});

ipcMain.handle(IPC_CHANNELS.DELETE_KEY, (_, keyId: string): void => {
  const keys = storeGet('keys', []);
  const filteredKeys = keys.filter(k => k.id !== keyId);
  storeSet('keys', filteredKeys);
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

// Base64 형식 검증 함수
const validateBase64 = (data: string): { isValid: boolean; error?: string } => {
  try {
    const cleanData = data.trim().replace(/\s/g, '');

    if (!cleanData) {
      return { isValid: false, error: 'Base64 데이터가 비어있습니다' };
    }

    // Base64 문자 집합 검증
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanData)) {
      return { isValid: false, error: 'Base64 형식이 올바르지 않습니다' };
    }

    // 길이 검증
    if (cleanData.length % 4 !== 0) {
      return { isValid: false, error: 'Base64 데이터 길이가 올바르지 않습니다 (4의 배수가 아님)' };
    }

    // 패딩 검증
    const paddingIndex = cleanData.indexOf('=');
    if (paddingIndex !== -1) {
      const paddingPart = cleanData.substring(paddingIndex);
      if (paddingPart !== '=' && paddingPart !== '==') {
        return { isValid: false, error: 'Base64 패딩이 올바르지 않습니다' };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Base64 데이터 검증 중 오류 발생' };
  }
};

// 하이브리드 암호화 함수 - RSA-OAEP는 node-rsa, RSA-PKCS1은 node-forge 사용
const encryptWithAlgorithm = (text: string, publicKeyPem: string, algorithm: string): string => {
  if (algorithm === 'RSA-PKCS1') {
    // node-forge를 사용하여 PKCS#1 v1.5 패딩으로 암호화
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encrypted = publicKey.encrypt(text); // 기본이 PKCS#1 v1.5
    return forge.util.encode64(encrypted);
  } else {
    // node-rsa를 사용하여 OAEP 패딩으로 암호화
    const key = new NodeRSA(publicKeyPem);
    key.setOptions({ encryptionScheme: 'pkcs1_oaep' });
    return key.encrypt(text, 'base64');
  }
};

const decryptWithAlgorithm = (encryptedText: string, privateKeyPem: string, algorithm: string): string => {
  // Base64 사전 검증
  const validation = validateBase64(encryptedText);
  if (!validation.isValid) {
    throw new Error(`입력 데이터 검증 실패: ${validation.error}`);
  }

  try {
    if (algorithm === 'RSA-PKCS1') {
      // node-forge를 사용하여 PKCS#1 v1.5 패딩으로 복호화
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const encrypted = forge.util.decode64(encryptedText);
      return privateKey.decrypt(encrypted); // 기본이 PKCS#1 v1.5
    } else {
      // node-rsa를 사용하여 OAEP 패딩으로 복호화
      const key = new NodeRSA(privateKeyPem);
      key.setOptions({ encryptionScheme: 'pkcs1_oaep' });
      return key.decrypt(encryptedText, 'utf8');
    }
  } catch (error) {
    // 구체적인 오류 메시지 분류
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    if (errorMessage.includes('decode') || errorMessage.includes('invalid')) {
      throw new Error(`Base64 디코딩 실패: 암호화 데이터가 손상되었을 수 있습니다`);
    } else if (errorMessage.includes('key') || errorMessage.includes('Key')) {
      throw new Error(`키 오류: 올바른 개인키를 사용하고 있는지 확인해주세요`);
    } else if (errorMessage.includes('algorithm') || errorMessage.includes('scheme')) {
      throw new Error(`알고리즘 오류: 암호화할 때 사용한 알고리즘과 동일한지 확인해주세요`);
    } else if (errorMessage.includes('padding')) {
      throw new Error(`패딩 오류: 암호화와 복호화 알고리즘이 일치하지 않습니다`);
    } else {
      throw new Error(`복호화 실패: ${errorMessage}`);
    }
  }
};

// Encryption/Decryption
ipcMain.handle(IPC_CHANNELS.ENCRYPT_TEXT, (_, text: string, publicKey: string, algorithm?: string): EncryptionResult => {
  try {
    const selectedAlgorithm = algorithm || 'RSA-OAEP';

    // 하이브리드 암호화 함수 사용
    const encrypted = encryptWithAlgorithm(text, publicKey, selectedAlgorithm);

    // 키 크기 계산을 위해 node-rsa 사용 (호환성)
    const key = new NodeRSA(publicKey);

    console.log(`암호화 완료 - 알고리즘: ${selectedAlgorithm}, 백엔드: ${selectedAlgorithm === 'RSA-PKCS1' ? 'node-forge' : 'node-rsa'}`);

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

    // 하이브리드 복호화 함수 사용
    const decrypted = decryptWithAlgorithm(encryptedText, privateKey, selectedAlgorithm);

    console.log(`복호화 완료 - 알고리즘: ${selectedAlgorithm}, 백엔드: ${selectedAlgorithm === 'RSA-PKCS1' ? 'node-forge' : 'node-rsa'}`);

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

// Auto updater IPC handlers
ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, () => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.handle(IPC_CHANNELS.RESTART_AND_INSTALL, () => {
  autoUpdater.quitAndInstall();
});

// History management
ipcMain.handle(IPC_CHANNELS.GET_HISTORY, async (_, filter?: HistoryFilter): Promise<HistoryItem[]> => {
  try {
    let history = storeGet('history', []);

    // Convert timestamp strings back to Date objects
    history = history.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));

    // Apply filters if provided
    if (filter) {
      if (filter.type) {
        history = history.filter(item => item.type === filter.type);
      }
      if (filter.keyId) {
        history = history.filter(item => item.keyId === filter.keyId);
      }
      if (filter.algorithm) {
        history = history.filter(item => item.algorithm === filter.algorithm);
      }
      if (filter.success !== undefined) {
        history = history.filter(item => item.success === filter.success);
      }
      if (filter.dateFrom) {
        history = history.filter(item => item.timestamp >= filter.dateFrom!);
      }
      if (filter.dateTo) {
        history = history.filter(item => item.timestamp <= filter.dateTo!);
      }
    }

    // Sort by timestamp (newest first)
    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('Failed to get history:', error);
    return [];
  }
});

ipcMain.handle(IPC_CHANNELS.SAVE_HISTORY_ITEM, async (_, historyItem: HistoryItem): Promise<void> => {
  try {
    const history = storeGet('history', []);
    history.push(historyItem);

    // Keep only the latest 1000 items to prevent excessive storage usage
    const maxHistoryItems = 1000;
    if (history.length > maxHistoryItems) {
      history.splice(0, history.length - maxHistoryItems);
    }

    storeSet('history', history);
  } catch (error) {
    console.error('Failed to save history item:', error);
    throw error;
  }
});

ipcMain.handle(IPC_CHANNELS.DELETE_HISTORY_ITEM, async (_, historyId: string): Promise<void> => {
  try {
    const history = storeGet('history', []);
    const updatedHistory = history.filter(item => item.id !== historyId);
    storeSet('history', updatedHistory);
  } catch (error) {
    console.error('Failed to delete history item:', error);
    throw error;
  }
});

ipcMain.handle(IPC_CHANNELS.CLEAR_HISTORY, async (): Promise<void> => {
  try {
    storeSet('history', []);
  } catch (error) {
    console.error('Failed to clear history:', error);
    throw error;
  }
});