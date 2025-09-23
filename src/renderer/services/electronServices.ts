import {
  ChainService,
  CryptoService,
  HistoryService,
  HttpTemplateService,
  KeyService,
  PlatformServices,
  UpdateService,
} from '../../shared/services/types';

const ensureElectronAPI = () => {
  if (!window.electronAPI) {
    throw new Error('Electron API is not available in this environment.');
  }
  return window.electronAPI;
};

const createKeyService = (): KeyService => ({
  list: () => ensureElectronAPI().getSavedKeys(),
  save: (key) => ensureElectronAPI().saveKey(key),
  remove: (keyId) => ensureElectronAPI().deleteKey(keyId),
});

const createHistoryService = (): HistoryService => ({
  list: (filter) => ensureElectronAPI().getHistory(filter),
  save: (item) => ensureElectronAPI().saveHistoryItem(item),
  remove: (historyId) => ensureElectronAPI().deleteHistoryItem(historyId),
  clear: () => ensureElectronAPI().clearHistory(),
});

const createChainService = (): ChainService => ({
  listTemplates: () => ensureElectronAPI().getChainTemplates(),
  saveTemplate: (template) => ensureElectronAPI().saveChainTemplate(template),
  updateTemplate: (template) => ensureElectronAPI().updateChainTemplate(template),
  removeTemplate: (templateId) => ensureElectronAPI().deleteChainTemplate(templateId),
  executeChain: (steps, inputText, templateId, templateName) =>
    ensureElectronAPI().executeChain(steps, inputText, templateId, templateName),
});

const createHttpTemplateService = (): HttpTemplateService => ({
  list: () => ensureElectronAPI().getHttpTemplates(),
  save: (template) => ensureElectronAPI().saveHttpTemplate(template),
  update: (template) => ensureElectronAPI().updateHttpTemplate(template),
  remove: (templateId) => ensureElectronAPI().deleteHttpTemplate(templateId),
  useTemplate: (templateId, pathParams, queryParams) =>
    ensureElectronAPI().useHttpTemplate(templateId, pathParams, queryParams),
});

const createCryptoService = (): CryptoService => ({
  encrypt: (text, publicKey, algorithm) =>
    ensureElectronAPI().encryptText(text, publicKey, algorithm),
  decrypt: (encryptedText, privateKey, algorithm) =>
    ensureElectronAPI().decryptText(encryptedText, privateKey, algorithm),
  generateKeyPair: (keySize) => ensureElectronAPI().generateRSAKeys(keySize),
});

const createUpdateService = (): UpdateService => ({
  onAvailable: (callback) => ensureElectronAPI().onUpdateAvailable?.(callback),
  onDownloadProgress: (callback) => ensureElectronAPI().onDownloadProgress?.(callback),
  onDownloaded: (callback) => ensureElectronAPI().onUpdateDownloaded?.(callback),
  onError: (callback) => ensureElectronAPI().onUpdateError?.(callback),
  removeAll: () => ensureElectronAPI().removeUpdateListeners?.(),
  checkForUpdates: () => ensureElectronAPI().checkForUpdates?.(),
  startDownload: () => ensureElectronAPI().startDownload?.(),
  restartAndInstall: () => ensureElectronAPI().restartAndInstall?.(),
});

export const electronServices: PlatformServices = {
  environment: 'electron',
  key: createKeyService(),
  history: createHistoryService(),
  chain: createChainService(),
  httpTemplate: createHttpTemplateService(),
  crypto: createCryptoService(),
  update: createUpdateService(),
};
