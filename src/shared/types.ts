export interface SavedKey {
  id: string;
  name: string;
  publicKey: string;
  privateKey: string;
  keySize: number;
  preferredAlgorithm: 'RSA-OAEP' | 'RSA-PKCS1';
  created: Date;
}

export interface EncryptionOptions {
  algorithm: 'RSA-OAEP' | 'RSA-PKCS1';
}

export interface EncryptionResult {
  data: string;
  algorithm: string;
  keySize: number;
  timestamp: Date;
}

// Legacy interface for compatibility (will be phased out)
export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
  keySize: number;
  created: Date;
}

export interface HistoryItem {
  id: string;
  type: 'encrypt' | 'decrypt' | 'url-encode' | 'url-decode';
  keyId?: string;  // Optional for URL operations
  keyName?: string;  // Optional for URL operations
  algorithm?: 'RSA-OAEP' | 'RSA-PKCS1';  // Optional for URL operations
  inputText: string;
  outputText: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  keySize?: number;  // Optional for URL operations
}

export interface HistoryFilter {
  type?: 'encrypt' | 'decrypt' | 'url-encode' | 'url-decode';
  keyId?: string;
  algorithm?: 'RSA-OAEP' | 'RSA-PKCS1';
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}