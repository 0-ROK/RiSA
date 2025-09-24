import { CryptoService } from '../../../shared/services/types';
import { rsaDecrypt, rsaEncrypt, rsaGenerateKeyPair, normalizeAlgorithm } from './crypto/browserCryptoCore';

export const browserCryptoService: CryptoService = {
  async encrypt(text, publicKey, algorithm) {
    const normalized = normalizeAlgorithm(algorithm);
    try {
      const result = await rsaEncrypt(text, publicKey, normalized);
      return {
        data: result.data,
        algorithm: normalized,
        keySize: result.keySize,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'OperationError') {
        throw new Error('암호화 실패: 입력 데이터가 너무 길거나 알고리즘이 지원되지 않습니다. 텍스트 길이와 키 크기를 확인해주세요.');
      }
      throw new Error(`암호화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  },
  async decrypt(encryptedText, privateKey, algorithm) {
    const normalized = normalizeAlgorithm(algorithm);
    try {
      return await rsaDecrypt(encryptedText, privateKey, normalized);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '복호화 실패: 알 수 없는 오류가 발생했습니다.');
    }
  },
  async generateKeyPair(keySize) {
    if (!Number.isFinite(keySize) || keySize < 1024) {
      throw new Error('유효한 키 크기를 입력해주세요. (1024비트 이상)');
    }
    try {
      return await rsaGenerateKeyPair(keySize);
    } catch (error) {
      throw new Error(`키 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  },
};
