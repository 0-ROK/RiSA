export const RSA_KEY_SIZES = [1024, 2048, 4096] as const;
export const RSA_ALGORITHMS = ['RSA-OAEP', 'RSA-PKCS1'] as const;

export const DEFAULT_ENCRYPTION_OPTIONS = {
  algorithm: 'RSA-OAEP' as const,
};

// 알고리즘 설명 및 보안 정보
export const ALGORITHM_INFO = {
  'RSA-OAEP': {
    name: 'RSA-OAEP',
    description: 'OAEP 패딩을 사용하는 RSA 암호화 (권장)',
    status: 'recommended',
  },
  'RSA-PKCS1': {
    name: 'RSA-PKCS1',
    description: 'PKCS#1 v1.5 패딩 (보안 위험 있음)',
    status: 'deprecated',
  },
} as const;

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

  // History management
  GET_HISTORY: 'get-history',
  SAVE_HISTORY_ITEM: 'save-history-item',
  DELETE_HISTORY_ITEM: 'delete-history-item',
  CLEAR_HISTORY: 'clear-history',

  // Auto updater
  CHECK_FOR_UPDATES: 'check-for-updates',
  RESTART_AND_INSTALL: 'restart-and-install',
  START_DOWNLOAD: 'start-download',
} as const;