import {
  ChainExecutionResult,
  ChainStep,
  ChainStepResult,
  ChainTemplate,
  HistoryFilter,
  HistoryItem,
  HttpTemplate,
  SavedKey,
} from '../../shared/types';
import {
  ChainService,
  CryptoService,
  HistoryService,
  HttpTemplateService,
  KeyService,
  PlatformServices,
} from '../../shared/services/types';

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const memoryStorage = (() => {
  const store = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
  return storage;
})();

const getStorage = (): StorageLike => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return memoryStorage;
};

const STORAGE_KEYS = {
  keys: 'risa.keys',
  history: 'risa.history',
  chainTemplates: 'risa.chainTemplates',
  httpTemplates: 'risa.httpTemplates',
} as const;

const readCollection = <T>(key: string, revive?: (item: any) => T): T[] => {
  try {
    const raw = getStorage().getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return revive ? parsed.map(item => revive(item)) : (parsed as T[]);
  } catch {
    return [];
  }
};

const writeCollection = <T>(key: string, value: T[]): void => {
  getStorage().setItem(key, JSON.stringify(value));
};

const reviveDate = (value: any, fallback = new Date()): Date => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const loadKeys = async (): Promise<SavedKey[]> =>
  readCollection<SavedKey>(STORAGE_KEYS.keys, (item) => ({
    ...item,
    created: reviveDate(item.created),
  }));

const keyService: KeyService = {
  async list() {
    return loadKeys();
  },
  async save(key) {
    const keys = await loadKeys();
    const index = keys.findIndex(k => k.id === key.id);
    if (index >= 0) {
      keys[index] = key;
    } else {
      keys.push(key);
    }
    writeCollection(STORAGE_KEYS.keys, keys);
  },
  async remove(keyId) {
    const keys = await loadKeys();
    const filtered = keys.filter(key => key.id !== keyId);
    writeCollection(STORAGE_KEYS.keys, filtered);
  },
};

const matchesFilter = (item: HistoryItem, filter?: HistoryFilter): boolean => {
  if (!filter) return true;
  if (filter.type && item.type !== filter.type) return false;
  if (filter.keyId && item.keyId !== filter.keyId) return false;
  if (filter.algorithm && item.algorithm !== filter.algorithm) return false;
  if (filter.success !== undefined && item.success !== filter.success) return false;
  if (filter.dateFrom && item.timestamp < filter.dateFrom) return false;
  if (filter.dateTo && item.timestamp > filter.dateTo) return false;
  if (filter.chainId && item.chainId !== filter.chainId) return false;
  return true;
};

const loadHistory = async (): Promise<HistoryItem[]> =>
  readCollection<HistoryItem>(STORAGE_KEYS.history, (item) => ({
    ...item,
    timestamp: reviveDate(item.timestamp),
  }));

const historyService: HistoryService = {
  async list(filter) {
    const history = await loadHistory();
    return history.filter(item => matchesFilter(item, filter));
  },
  async save(item) {
    const history = await loadHistory();
    history.unshift(item);
    writeCollection(STORAGE_KEYS.history, history);
  },
  async remove(historyId) {
    const history = await loadHistory();
    writeCollection(STORAGE_KEYS.history, history.filter(item => item.id !== historyId));
  },
  async clear() {
    writeCollection(STORAGE_KEYS.history, []);
  },
};

const reviveChainTemplate = (template: ChainTemplate): ChainTemplate => ({
  ...template,
  created: reviveDate(template.created),
  lastUsed: template.lastUsed ? reviveDate(template.lastUsed) : undefined,
});

const chainTemplatesKey = STORAGE_KEYS.chainTemplates;

const listTemplates = async (): Promise<ChainTemplate[]> => {
  return readCollection(chainTemplatesKey, (item) => reviveChainTemplate(item));
};

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

const runChainStep = (step: ChainStep, input: string): string => {
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
    case 'rsa-encrypt':
    case 'rsa-decrypt':
      throw new Error('웹 데모에서는 RSA 관련 체인 스텝을 지원하지 않습니다.');
    default:
      throw new Error(`지원되지 않는 스텝 유형입니다: ${step.type}`);
  }
};

const chainService: ChainService = {
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
    writeCollection(chainTemplatesKey, templates.filter(t => t.id !== templateId));
  },
  async executeChain(steps, inputText, templateId, templateName) {
    const results: ChainStepResult[] = [];
    let currentOutput = inputText;
    const enabledSteps = steps.filter(step => step.enabled);

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
        const output = runChainStep(step, currentOutput);
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

const loadHttpTemplates = async (): Promise<HttpTemplate[]> =>
  readCollection<HttpTemplate>(STORAGE_KEYS.httpTemplates, (item) => ({
    ...item,
    created: reviveDate(item.created),
    lastUsed: item.lastUsed ? reviveDate(item.lastUsed) : undefined,
  }));

const httpTemplateService: HttpTemplateService = {
  async list() {
    return loadHttpTemplates();
  },
  async save(template) {
    const templates = await loadHttpTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      throw new Error('동일한 ID의 템플릿이 이미 존재합니다.');
    }
    templates.push(template);
    writeCollection(STORAGE_KEYS.httpTemplates, templates);
  },
  async update(template) {
    const templates = await loadHttpTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index === -1) {
      throw new Error('템플릿을 찾을 수 없습니다.');
    }
    templates[index] = template;
    writeCollection(STORAGE_KEYS.httpTemplates, templates);
  },
  async remove(templateId) {
    const templates = await loadHttpTemplates();
    writeCollection(STORAGE_KEYS.httpTemplates, templates.filter(t => t.id !== templateId));
  },
  async useTemplate(templateId, pathParams, queryParams) {
    const templates = await this.list();
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('선택한 템플릿을 찾을 수 없습니다.');
    }

    let fullUrl = template.baseUrl;

    if (template.pathTemplate) {
      let pathPart = template.pathTemplate;
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
    if (template.queryTemplate) {
      try {
        const expectedParams = JSON.parse(template.queryTemplate);
        if (Array.isArray(expectedParams)) {
          expectedParams.forEach((key: string) => {
            if (queryParams[key]) {
              params.set(key, queryParams[key]);
            }
          });
        }
      } catch {
        // ignore parsing errors
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
  },
};

const cryptoService: CryptoService = {
  async encrypt() {
    throw new Error('웹 데모에서는 RSA 암호화를 지원하지 않습니다.');
  },
  async decrypt() {
    throw new Error('웹 데모에서는 RSA 복호화를 지원하지 않습니다.');
  },
  async generateKeyPair() {
    throw new Error('웹 데모에서는 RSA 키 생성을 지원하지 않습니다.');
  },
};

export const browserServices: PlatformServices = {
  environment: 'web',
  key: keyService,
  history: historyService,
  chain: chainService,
  httpTemplate: httpTemplateService,
  crypto: cryptoService,
};
