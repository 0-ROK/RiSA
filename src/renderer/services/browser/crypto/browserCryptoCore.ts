import { RSAKeyPair } from '../../../../shared/types';

export type SupportedRSAAlgorithm = 'RSA-OAEP' | 'RSA-PKCS1';

const ensureSubtleCrypto = (): SubtleCrypto => {
  const cryptoObj = (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined) as Crypto | undefined;
  const subtle = cryptoObj?.subtle ?? (cryptoObj ? (cryptoObj as any).webkitSubtle : undefined);
  if (!subtle) {
    throw new Error('이 브라우저는 Web Crypto API를 지원하지 않습니다. 최신 버전의 브라우저를 사용해주세요.');
  }
  return subtle;
};

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }
  return Buffer.from(buffer).toString('base64');
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
  const normalized = base64.replace(/\s+/g, '');
  if (!normalized) {
    return new ArrayBuffer(0);
  }
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binary = window.atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  return Buffer.from(normalized, 'base64').buffer;
};

const derToPem = (buffer: ArrayBuffer, label: 'PUBLIC KEY' | 'PRIVATE KEY'): string => {
  const base64 = bufferToBase64(buffer);
  const chunks = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${chunks.join('\n')}\n-----END ${label}-----`;
};

const pemToDer = (pem: string): ArrayBuffer => {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  return base64ToBuffer(base64);
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const stringToBuffer = (value: string): ArrayBuffer => textEncoder.encode(value).buffer;
const bufferToString = (buffer: ArrayBuffer): string => textDecoder.decode(buffer);

const validateBase64 = (data: string): { isValid: boolean; error?: string } => {
  try {
    const cleanData = data.trim().replace(/\s/g, '');

    if (!cleanData) {
      return { isValid: false, error: 'Base64 데이터가 비어있습니다' };
    }

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanData)) {
      return { isValid: false, error: 'Base64 형식이 올바르지 않습니다' };
    }

    if (cleanData.length % 4 !== 0) {
      return { isValid: false, error: 'Base64 데이터 길이가 올바르지 않습니다 (4의 배수가 아닙니다)' };
    }

    const paddingIndex = cleanData.indexOf('=');
    if (paddingIndex !== -1) {
      const paddingPart = cleanData.substring(paddingIndex);
      if (paddingPart !== '=' && paddingPart !== '==') {
        return { isValid: false, error: 'Base64 패딩이 올바르지 않습니다' };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Base64 데이터 검증 중 오류가 발생했습니다' };
  }
};

const getImportParams = (algorithm: SupportedRSAAlgorithm): AlgorithmIdentifier => {
  if (algorithm === 'RSA-PKCS1') {
    return { name: 'RSAES-PKCS1-v1_5' } as AlgorithmIdentifier;
  }
  return {
    name: 'RSA-OAEP',
    hash: 'SHA-1',
  } as RsaHashedImportParams;
};

const extractModulusLength = (key: CryptoKey): number => {
  const algorithm = key.algorithm as unknown as { modulusLength?: number };
  const value = algorithm?.modulusLength;
  return typeof value === 'number' ? value : 0;
};

const importPublicKey = async (
  pem: string,
  algorithm: SupportedRSAAlgorithm,
): Promise<{ key: CryptoKey; modulusLength: number }> => {
  const subtle = ensureSubtleCrypto();
  const keyData = pemToDer(pem);
  const cryptoKey = await subtle.importKey(
    'spki',
    keyData,
    getImportParams(algorithm),
    false,
    ['encrypt']
  );
  return {
    key: cryptoKey,
    modulusLength: extractModulusLength(cryptoKey),
  };
};

const importPrivateKey = async (pem: string, algorithm: SupportedRSAAlgorithm): Promise<CryptoKey> => {
  const subtle = ensureSubtleCrypto();
  const keyData = pemToDer(pem);
  return subtle.importKey(
    'pkcs8',
    keyData,
    getImportParams(algorithm),
    false,
    ['decrypt']
  );
};

export const rsaEncrypt = async (
  text: string,
  publicKeyPem: string,
  algorithm: SupportedRSAAlgorithm,
): Promise<{ data: string; keySize: number }> => {
  const { key, modulusLength } = await importPublicKey(publicKeyPem, algorithm);
  const subtle = ensureSubtleCrypto();
  const dataBuffer = stringToBuffer(text);
  const encrypted = await subtle.encrypt(
    getImportParams(algorithm),
    key,
    dataBuffer,
  );
  return {
    data: bufferToBase64(encrypted),
    keySize: modulusLength,
  };
};

export const rsaDecrypt = async (
  encryptedText: string,
  privateKeyPem: string,
  algorithm: SupportedRSAAlgorithm,
): Promise<string> => {
  const validation = validateBase64(encryptedText);
  if (!validation.isValid) {
    throw new Error(`입력 데이터 검증 실패: ${validation.error}`);
  }

  const subtle = ensureSubtleCrypto();
  const key = await importPrivateKey(privateKeyPem, algorithm);
  try {
    const decrypted = await subtle.decrypt(
      getImportParams(algorithm),
      key,
      base64ToBuffer(encryptedText),
    );
    return bufferToString(decrypted);
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'DataError') {
        throw new Error('Base64 디코딩 실패: 암호화 데이터가 손상되었을 수 있습니다.');
      }
      if (error.name === 'OperationError') {
        throw new Error('복호화 실패: 키 또는 알고리즘이 올바른지 확인해주세요.');
      }
    }
    throw new Error(`복호화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

export const rsaGenerateKeyPair = async (keySize: number): Promise<RSAKeyPair> => {
  const subtle = ensureSubtleCrypto();
  const keyPair = await subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: keySize,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-1',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyBuffer = await subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: derToPem(publicKeyBuffer, 'PUBLIC KEY'),
    privateKey: derToPem(privateKeyBuffer, 'PRIVATE KEY'),
    keySize,
    created: new Date(),
  };
};

export const normalizeAlgorithm = (algorithm?: string): SupportedRSAAlgorithm => (
  algorithm === 'RSA-PKCS1' ? 'RSA-PKCS1' : 'RSA-OAEP'
);
