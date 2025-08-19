export const RSA_KEY_SIZES = [1024, 2048, 4096] as const;
export const RSA_ALGORITHMS = ['RSA-OAEP', 'RSA-PKCS1'] as const;

export const DEFAULT_ENCRYPTION_OPTIONS = {
  algorithm: 'RSA-OAEP' as const,
};

export const IPC_CHANNELS = {
  // Key management
  GET_SAVED_KEYS: 'get-saved-keys',
  SAVE_KEY: 'save-key',
  DELETE_KEY: 'delete-key',
  GENERATE_RSA_KEYS: 'generate-rsa-keys',
  
  // Encryption/Decryption
  ENCRYPT_TEXT: 'encrypt-text',
  DECRYPT_TEXT: 'decrypt-text',
  
  // File operations
  SELECT_FILE: 'select-file',
  EXPORT_KEY: 'export-key',
  IMPORT_KEY: 'import-key',
} as const;