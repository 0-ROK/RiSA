export const DEFAULT_SETTINGS: AppSettings = {
  environment: 'development',
  rsaKeySize: 2048,
  algorithm: 'RSA-OAEP',
  defaultSavePath: '',
  tempPath: '',
  autoBackup: true,
  encryptionLevel: 'basic',
  theme: 'light',
};

export const RSA_KEY_SIZES = [1024, 2048, 4096] as const;
export const RSA_ALGORITHMS = ['RSA-OAEP', 'RSA-PKCS1'] as const;
export const ENCRYPTION_LEVELS = ['basic', 'advanced'] as const;
export const THEMES = ['light', 'dark'] as const;
export const ENVIRONMENTS = ['development', 'production'] as const;

export const IPC_CHANNELS = {
  GET_SETTINGS: 'get-settings',
  SET_SETTINGS: 'set-settings',
  GENERATE_RSA_KEYS: 'generate-rsa-keys',
  ENCRYPT_TEXT: 'encrypt-text',
  DECRYPT_TEXT: 'decrypt-text',
  ENCRYPT_FILE: 'encrypt-file',
  DECRYPT_FILE: 'decrypt-file',
  SELECT_FOLDER: 'select-folder',
  SELECT_FILE: 'select-file',
  EXPORT_SETTINGS: 'export-settings',
  IMPORT_SETTINGS: 'import-settings',
} as const;

import type { AppSettings } from './types';