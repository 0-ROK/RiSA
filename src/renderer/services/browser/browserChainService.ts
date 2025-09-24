import {
  ChainExecutionResult,
  ChainStep,
  ChainStepResult,
  ChainTemplate,
  SavedKey,
} from '../../../shared/types';
import { ChainService } from '../../../shared/services/types';
import {
  STORAGE_KEYS,
  isRecord,
  readCollection,
  reviveDate,
  writeCollection,
} from './storage/browserStorageCommon';
import { loadKeys } from './storage/browserKeyService';
import { normalizeAlgorithm, rsaDecrypt, rsaEncrypt } from './crypto/browserCryptoCore';

const reviveChainTemplate = (template: unknown): ChainTemplate => {
  if (!isRecord(template)) {
    throw new Error('Invalid chain template record');
  }
  const record = template as Record<string, unknown>;
  const base = template as unknown as ChainTemplate;
  return {
    ...base,
    created: reviveDate(record.created),
    lastUsed: record.lastUsed ? reviveDate(record.lastUsed) : undefined,
  };
};

const chainTemplatesKey = STORAGE_KEYS.chainTemplates;

const listTemplates = async (): Promise<ChainTemplate[]> =>
  readCollection(chainTemplatesKey, reviveChainTemplate);

const simpleBase64Encode = (value: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }
  if (typeof btoa === 'function' && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  throw new Error('Base64 인코딩을 지원하지 않는 환경입니다.');
};

const simpleBase64Decode = (value: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }
  if (typeof atob === 'function' && typeof TextDecoder !== 'undefined') {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  throw new Error('Base64 디코딩을 지원하지 않는 환경입니다.');
};

const generateId = (): string => {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const executeHttpParse = (input: string, step: ChainStep): string => {
  const url = new URL(input.trim());
  const pathTemplate = step.params?.pathTemplate || '';
  const queryTemplate = step.params?.queryTemplate || '';
  const outputType = step.params?.outputType || 'full';
  const outputField = step.params?.outputField;
  const outputParam = step.params?.outputParam;

  const pathParams: Record<string, string> = {};
  if (pathTemplate) {
    const templateParts = pathTemplate.split('/').filter(Boolean);
    const urlParts = url.pathname.split('/').filter(Boolean);

    templateParts.forEach((templatePart, index) => {
      if (templatePart.startsWith(':')) {
        const paramName = templatePart.substring(1);
        if (urlParts[index]) {
          pathParams[paramName] = decodeURIComponent(urlParts[index]);
        }
      } else if (templatePart.startsWith('{') && templatePart.endsWith('}')) {
        const paramName = templatePart.slice(1, -1);
        if (urlParts[index]) {
          pathParams[paramName] = decodeURIComponent(urlParts[index]);
        }
      }
    });
  }

  const queryParams: Record<string, string> = {};
  if (queryTemplate) {
    try {
      const queryKeys = JSON.parse(queryTemplate);
      if (Array.isArray(queryKeys)) {
        const urlParams = new URLSearchParams(url.search);
        queryKeys.forEach(key => {
          const value = urlParams.get(key);
          if (value !== null) {
            queryParams[key] = value;
          }
        });
      }
    } catch {
      // ignore JSON parse errors and return empty query params
    }
  } else {
    const urlParams = new URLSearchParams(url.search);
    urlParams.forEach((value, key) => {
      queryParams[key] = value;
    });
  }

  const result = {
    protocol: url.protocol,
    host: url.host,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    pathParams,
    queryParams,
  };

  if (outputType === 'field' && outputField) {
    return (result as any)[outputField] ?? '';
  }

  if (outputType === 'param' && outputParam) {
    return result.queryParams[outputParam] ?? '';
  }

  return JSON.stringify(result, null, 2);
};

const executeHttpBuild = (input: string, step: ChainStep): string => {
  let baseUrl = step.params?.baseUrl || '';
  if (!baseUrl) {
    baseUrl = input.trim();
  }

  let fullUrl = baseUrl;

  const pathParams = (step.params?.pathParams ?? {}) as Record<string, string>;
  const queryParams = (step.params?.queryParams ?? {}) as Record<string, string>;
  const pathTemplate = step.params?.pathTemplate || '';
  const queryTemplate = step.params?.queryTemplate || '';

  if (pathTemplate) {
    let pathPart = pathTemplate;
    Object.entries(pathParams).forEach(([key, value]) => {
      pathPart = pathPart
        .replace(`:${key}`, encodeURIComponent(value))
        .replace(`{${key}}`, encodeURIComponent(value));
    });

    if (!fullUrl.endsWith('/') && !pathPart.startsWith('/')) {
      fullUrl += '/';
    }
    if (fullUrl.endsWith('/') && pathPart.startsWith('/')) {
      pathPart = pathPart.substring(1);
    }

    fullUrl += pathPart;
  }

  const params = new URLSearchParams();
  if (queryTemplate) {
    try {
      const expectedParams = JSON.parse(queryTemplate);
      if (Array.isArray(expectedParams)) {
        expectedParams.forEach((key: string) => {
          if (queryParams[key]) {
            params.set(key, queryParams[key]);
          }
        });
      }
    } catch {
      // ignore template parsing errors
    }
  } else {
    Object.entries(queryParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  const queryString = params.toString();
  if (queryString) {
    fullUrl += fullUrl.includes('?') ? '&' : '?';
    fullUrl += queryString;
  }

  return fullUrl;
};

interface ChainExecutionContext {
  keysById: Map<string, SavedKey>;
}

const resolveChainKey = (keyId: string | undefined, context: ChainExecutionContext): SavedKey => {
  if (!keyId) {
    throw new Error('RSA 키가 선택되지 않았습니다.');
  }
  const key = context.keysById.get(keyId);
  if (!key) {
    throw new Error('선택한 RSA 키를 찾을 수 없습니다. 키가 삭제되었거나 이름이 변경되었을 수 있습니다.');
  }
  return key;
};

const runChainStep = async (step: ChainStep, input: string, context: ChainExecutionContext): Promise<string> => {
  switch (step.type) {
    case 'url-encode':
      return encodeURIComponent(input);
    case 'url-decode':
      return decodeURIComponent(input);
    case 'base64-encode':
      return simpleBase64Encode(input);
    case 'base64-decode':
      return simpleBase64Decode(input);
    case 'http-parse':
      return executeHttpParse(input, step);
    case 'http-build':
      return executeHttpBuild(input, step);
    case 'rsa-encrypt': {
      const key = resolveChainKey(step.params?.keyId, context);
      const algorithm = normalizeAlgorithm(step.params?.algorithm ?? key.preferredAlgorithm);
      const { data } = await rsaEncrypt(input, key.publicKey, algorithm);
      return data;
    }
    case 'rsa-decrypt': {
      const key = resolveChainKey(step.params?.keyId, context);
      const algorithm = normalizeAlgorithm(step.params?.algorithm ?? key.preferredAlgorithm);
      return rsaDecrypt(input, key.privateKey, algorithm);
    }
    default:
      throw new Error(`지원되지 않는 스텝 유형입니다: ${step.type}`);
  }
};

export const browserChainService: ChainService = {
  async listTemplates() {
    return listTemplates();
  },
  async saveTemplate(template) {
    const templates = await listTemplates();
    const existingIndex = templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }
    writeCollection(chainTemplatesKey, templates);
  },
  async updateTemplate(template) {
    const templates = await listTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index === -1) {
      throw new Error(`템플릿을 찾을 수 없습니다: ${template.id}`);
    }
    templates[index] = template;
    writeCollection(chainTemplatesKey, templates);
  },
  async removeTemplate(templateId) {
    const templates = await listTemplates();
    writeCollection(
      chainTemplatesKey,
      templates.filter(t => t.id !== templateId),
    );
  },
  async executeChain(steps, inputText, templateId, templateName) {
    const results: ChainStepResult[] = [];
    let currentOutput = inputText;
    const enabledSteps = steps.filter(step => step.enabled);
    const keys = await loadKeys();
    const context: ChainExecutionContext = {
      keysById: new Map(keys.map(key => [key.id, key])),
    };

    for (const step of enabledSteps) {
      const start = Date.now();
      const result: ChainStepResult = {
        stepId: step.id,
        stepType: step.type,
        input: currentOutput,
        output: '',
        success: false,
        duration: 0,
      };

      try {
        const output = await runChainStep(step, currentOutput, context);
        result.output = output;
        result.success = true;
        currentOutput = output;
      } catch (error) {
        result.error = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        result.success = false;
        result.output = currentOutput;
      } finally {
        result.duration = Date.now() - start;
      }

      results.push(result);

      if (!result.success) {
        break;
      }
    }

    const success = results.every(step => step.success);

    const executionResult: ChainExecutionResult = {
      id: generateId(),
      templateId,
      templateName,
      success,
      steps: results,
      finalOutput: currentOutput,
      totalDuration: results.reduce((total, step) => total + step.duration, 0),
      timestamp: new Date(),
      inputText,
    };

    return executionResult;
  },
};
