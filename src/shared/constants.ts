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

// Chain module definitions
export const CHAIN_MODULES = {
  'url-encode': {
    name: 'URL 인코딩',
    description: 'URL 안전 문자로 인코딩',
    category: 'encoding' as const,
    icon: 'LinkOutlined',
  },
  'url-decode': {
    name: 'URL 디코딩',
    description: 'URL 인코딩된 문자를 디코딩',
    category: 'encoding' as const,
    icon: 'LinkOutlined',
  },
  'rsa-encrypt': {
    name: 'RSA 암호화',
    description: 'RSA 공개키로 암호화',
    category: 'crypto' as const,
    icon: 'LockOutlined',
    requiredParams: ['keyId'],
    optionalParams: ['algorithm'],
  },
  'rsa-decrypt': {
    name: 'RSA 복호화',
    description: 'RSA 개인키로 복호화',
    category: 'crypto' as const,
    icon: 'UnlockOutlined',
    requiredParams: ['keyId'],
    optionalParams: ['algorithm'],
  },
  'base64-encode': {
    name: 'Base64 인코딩',
    description: 'Base64로 인코딩',
    category: 'encoding' as const,
    icon: 'CodeOutlined',
  },
  'base64-decode': {
    name: 'Base64 디코딩',
    description: 'Base64를 디코딩',
    category: 'encoding' as const,
    icon: 'CodeOutlined',
  },
  'http-parse': {
    name: 'HTTP 파싱',
    description: 'URL을 분석하여 구성 요소 추출',
    category: 'http' as const,
    icon: 'ApiOutlined',
    requiredParams: ['outputField'],
    optionalParams: ['pathTemplate', 'queryTemplate', 'httpTemplateId'],
  },
  'http-build': {
    name: 'HTTP 생성',
    description: '파라미터로부터 URL 생성',
    category: 'http' as const,
    icon: 'LinkOutlined',
    requiredParams: ['baseUrl'],
    optionalParams: ['pathTemplate', 'queryTemplate', 'inputMapping', 'httpTemplateId'],
  },
} as const;

// Predefined chain templates
export const DEFAULT_CHAIN_TEMPLATES = [
  {
    id: 'secure-url-send',
    name: '보안 URL 전송',
    description: 'URL을 안전하게 전송하기 위해 인코딩 → RSA 암호화 → Base64 인코딩',
    tags: ['보안', 'URL', '전송'],
    steps: [
      { id: '1', type: 'url-encode' as const, enabled: true, params: {} },
      { id: '2', type: 'rsa-encrypt' as const, enabled: true, params: {} },
      { id: '3', type: 'base64-encode' as const, enabled: true, params: {} },
    ],
  },
  {
    id: 'secure-url-receive',
    name: '보안 URL 수신',
    description: '암호화된 URL을 복호화 Base64 디코딩 → RSA 복호화 → URL 디코딩',
    tags: ['보안', 'URL', '수신'],
    steps: [
      { id: '1', type: 'base64-decode' as const, enabled: true, params: {} },
      { id: '2', type: 'rsa-decrypt' as const, enabled: true, params: {} },
      { id: '3', type: 'url-decode' as const, enabled: true, params: {} },
    ],
  },
  {
    id: 'double-encoding',
    name: '이중 인코딩',
    description: '텍스트를 URL 인코딩 후 Base64로 한 번 더 인코딩',
    tags: ['인코딩', '변환'],
    steps: [
      { id: '1', type: 'url-encode' as const, enabled: true, params: {} },
      { id: '2', type: 'base64-encode' as const, enabled: true, params: {} },
    ],
  },
  {
    id: 'complete-encryption',
    name: '완전 암호화',
    description: 'RSA 암호화 후 Base64로 인코딩하여 전송 가능한 형태로 변환',
    tags: ['암호화', '보안'],
    steps: [
      { id: '1', type: 'rsa-encrypt' as const, enabled: true, params: {} },
      { id: '2', type: 'base64-encode' as const, enabled: true, params: {} },
    ],
  },
] as const;

export const IPC_CHANNELS = {
  // Key management
  GET_SAVED_KEYS: 'get-saved-keys',
  SAVE_KEY: 'save-key',
  DELETE_KEY: 'delete-key',
  GENERATE_RSA_KEYS: 'generate-rsa-keys',

  // Encryption/Decryption
  ENCRYPT_TEXT: 'encrypt-text',
  DECRYPT_TEXT: 'decrypt-text',

  // Chain operations
  EXECUTE_CHAIN: 'execute-chain',
  SAVE_CHAIN_TEMPLATE: 'save-chain-template',
  GET_CHAIN_TEMPLATES: 'get-chain-templates',
  DELETE_CHAIN_TEMPLATE: 'delete-chain-template',
  UPDATE_CHAIN_TEMPLATE: 'update-chain-template',
  GET_CHAIN_MODULES: 'get-chain-modules',

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

  // HTTP templates
  GET_HTTP_TEMPLATES: 'get-http-templates',
  SAVE_HTTP_TEMPLATE: 'save-http-template',
  UPDATE_HTTP_TEMPLATE: 'update-http-template',
  DELETE_HTTP_TEMPLATE: 'delete-http-template',
  USE_HTTP_TEMPLATE: 'use-http-template',
} as const;