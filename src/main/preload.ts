import { contextBridge, ipcRenderer } from 'electron';
import { SavedKey, RSAKeyPair, EncryptionResult, HistoryItem, HistoryFilter } from '../shared/types';
import { IPC_CHANNELS } from '../shared/constants';

const electronAPI = {
  // Key management
  getSavedKeys: (): Promise<SavedKey[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SAVED_KEYS),

  saveKey: (key: SavedKey): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_KEY, key),

  deleteKey: (keyId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_KEY, keyId),

  generateRSAKeys: (keySize: number): Promise<RSAKeyPair> =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_RSA_KEYS, keySize),

  // Encryption/Decryption
  encryptText: (text: string, publicKey: string, algorithm?: string): Promise<EncryptionResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.ENCRYPT_TEXT, text, publicKey, algorithm),

  decryptText: (encryptedText: string, privateKey: string, algorithm?: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.DECRYPT_TEXT, encryptedText, privateKey, algorithm),

  // File operations
  selectFile: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_FILE),

  exportKey: (key: SavedKey): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_KEY, key),

  importKey: (): Promise<SavedKey | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_KEY),

  // Auto updater
  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_FOR_UPDATES),

  restartAndInstall: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESTART_AND_INSTALL),

  // Update event listeners
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },

  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('download-progress', (_event, progress) => callback(progress));
  },

  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },

  // History management
  getHistory: (filter?: HistoryFilter): Promise<HistoryItem[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY, filter),

  saveHistoryItem: (historyItem: HistoryItem): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_HISTORY_ITEM, historyItem),

  deleteHistoryItem: (historyId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_HISTORY_ITEM, historyId),

  clearHistory: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEAR_HISTORY),

  // 이벤트 리스너 제거
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;