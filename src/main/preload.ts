import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings, RSAKeyPair, EncryptionResult } from '../shared/types';
import { IPC_CHANNELS } from '../shared/constants';

const electronAPI = {
  // Settings
  getSettings: (): Promise<AppSettings> => 
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  
  setSettings: (settings: AppSettings): Promise<void> => 
    ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS, settings),

  // RSA Operations
  generateRSAKeys: (keySize: number): Promise<RSAKeyPair> => 
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_RSA_KEYS, keySize),

  encryptText: (text: string, publicKey: string): Promise<EncryptionResult> => 
    ipcRenderer.invoke(IPC_CHANNELS.ENCRYPT_TEXT, text, publicKey),

  decryptText: (encryptedText: string, privateKey: string): Promise<string> => 
    ipcRenderer.invoke(IPC_CHANNELS.DECRYPT_TEXT, encryptedText, privateKey),

  // File Operations
  selectFolder: (): Promise<string | null> => 
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER),

  selectFile: (): Promise<string | null> => 
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_FILE),

  // Import/Export
  exportSettings: (): Promise<boolean> => 
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SETTINGS),

  importSettings: (): Promise<boolean> => 
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_SETTINGS),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;