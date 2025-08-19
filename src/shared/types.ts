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