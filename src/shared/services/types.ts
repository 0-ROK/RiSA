import {
  ChainExecutionResult,
  ChainStep,
  ChainTemplate,
  HistoryFilter,
  HistoryItem,
  HttpTemplate,
  SavedKey,
  EncryptionResult,
  RSAKeyPair,
} from '../types';

export interface KeyService {
  list(): Promise<SavedKey[]>;
  save(key: SavedKey): Promise<void>;
  remove(keyId: string): Promise<void>;
}

export interface HistoryService {
  list(filter?: HistoryFilter): Promise<HistoryItem[]>;
  save(item: HistoryItem): Promise<void>;
  remove(historyId: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ChainService {
  listTemplates(): Promise<ChainTemplate[]>;
  saveTemplate(template: ChainTemplate): Promise<void>;
  updateTemplate(template: ChainTemplate): Promise<void>;
  removeTemplate(templateId: string): Promise<void>;
  executeChain(
    steps: ChainStep[],
    inputText: string,
    templateId?: string,
    templateName?: string,
  ): Promise<ChainExecutionResult>;
}

export interface HttpTemplateService {
  list(): Promise<HttpTemplate[]>;
  save(template: HttpTemplate): Promise<void>;
  update(template: HttpTemplate): Promise<void>;
  remove(templateId: string): Promise<void>;
  useTemplate(
    templateId: string,
    pathParams: Record<string, string>,
    queryParams: Record<string, string>,
  ): Promise<string>;
}

export interface CryptoService {
  encrypt(
    text: string,
    publicKey: string,
    algorithm?: string,
  ): Promise<EncryptionResult>;
  decrypt(
    encryptedText: string,
    privateKey: string,
    algorithm?: string,
  ): Promise<string>;
  generateKeyPair(keySize: number): Promise<RSAKeyPair>;
}

export interface UpdateListeners {
  onAvailable?: (callback: (info: any) => void) => void;
  onDownloadProgress?: (callback: (progress: any) => void) => void;
  onDownloaded?: (callback: (info: any) => void) => void;
  onError?: (callback: (error: string) => void) => void;
  removeAll?: () => void;
}

export interface UpdateService extends UpdateListeners {
  checkForUpdates?: () => Promise<void> | void;
  startDownload?: () => Promise<void> | void;
  restartAndInstall?: () => Promise<void> | void;
}

export interface PlatformServices {
  environment: 'electron' | 'web';
  key: KeyService;
  history: HistoryService;
  chain: ChainService;
  httpTemplate: HttpTemplateService;
  crypto: CryptoService;
  update?: UpdateService;
}
