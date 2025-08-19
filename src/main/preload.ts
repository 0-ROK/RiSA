import { contextBridge, ipcRenderer } from 'electron';
import { SavedKey, RSAKeyPair, EncryptionResult } from '../shared/types';
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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;