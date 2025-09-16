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

// Chain-related types
export type ChainStepType = 'url-encode' | 'url-decode' | 'rsa-encrypt' | 'rsa-decrypt' | 'base64-encode' | 'base64-decode' | 'http-parse' | 'http-build';

export interface ChainStep {
  id: string;
  type: ChainStepType;
  params?: {
    keyId?: string;
    algorithm?: 'RSA-OAEP' | 'RSA-PKCS1';
    // HTTP-specific parameters
    httpTemplateId?: string;
    baseUrl?: string;
    pathTemplate?: string;
    queryTemplate?: string;
    outputField?: string;
    inputMapping?: string;
    [key: string]: any;
  };
  enabled: boolean;
  name?: string;
  description?: string;
}

export interface ChainTemplate {
  id: string;
  name: string;
  description?: string;
  steps: ChainStep[];
  created: Date;
  lastUsed?: Date;
  tags?: string[];
}

export interface ChainStepResult {
  stepId: string;
  stepType: ChainStepType;
  input: string;
  output: string;
  success: boolean;
  error?: string;
  duration: number;
}

export interface ChainExecutionResult {
  id: string;
  templateId?: string;
  templateName?: string;
  success: boolean;
  steps: ChainStepResult[];
  finalOutput: string;
  totalDuration: number;
  timestamp: Date;
  inputText: string;
}

export interface ChainModule {
  type: ChainStepType;
  name: string;
  description: string;
  category: 'encoding' | 'crypto' | 'transform' | 'http';
  icon: string;
  requiredParams?: string[];
  optionalParams?: string[];
}

export interface HistoryItem {
  id: string;
  type: 'encrypt' | 'decrypt' | 'url-encode' | 'url-decode' | 'base64-encode' | 'base64-decode' | 'chain' | 'http-parse' | 'http-build';
  keyId?: string;  // Optional for encoding operations and chains
  keyName?: string;  // Optional for encoding operations and chains
  algorithm?: 'RSA-OAEP' | 'RSA-PKCS1';  // Optional for encoding operations and chains
  inputText: string;
  outputText: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  keySize?: number;  // Optional for encoding operations and chains
  // Chain-specific fields
  chainId?: string;
  chainName?: string;
  chainSteps?: number;
  chainDuration?: number;
}

export interface HistoryFilter {
  type?: 'encrypt' | 'decrypt' | 'url-encode' | 'url-decode' | 'base64-encode' | 'base64-decode' | 'chain' | 'http-parse' | 'http-build';
  keyId?: string;
  algorithm?: 'RSA-OAEP' | 'RSA-PKCS1';
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  chainId?: string;
}

// HTTP Template types
export interface HttpTemplate {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  pathTemplate: string;
  queryTemplate: string;
  created: Date;
  lastUsed?: Date;
  tags?: string[];
  category?: 'api' | 'web' | 'custom';
}

export interface HttpTemplateUsage {
  templateId: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  generatedUrl: string;
  timestamp: Date;
}