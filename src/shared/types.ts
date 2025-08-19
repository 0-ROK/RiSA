export interface AppSettings {
  environment: 'development' | 'production';
  rsaKeySize: 1024 | 2048 | 4096;
  algorithm: 'RSA-OAEP' | 'RSA-PKCS1';
  defaultSavePath: string;
  tempPath: string;
  autoBackup: boolean;
  encryptionLevel: 'basic' | 'advanced';
  theme: 'light' | 'dark';
}

export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
  keySize: number;
  created: Date;
}

export interface EncryptionResult {
  data: string;
  algorithm: string;
  keySize: number;
  timestamp: Date;
}

export interface FileEncryptionTask {
  id: string;
  fileName: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  operation: 'encrypt' | 'decrypt' | 'key-generation' | 'settings';
}