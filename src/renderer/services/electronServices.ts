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

const createKeyService = (): KeyService => {
  const electronAPI = ensureElectronAPI();
  return {
    list: () => electronAPI.getSavedKeys(),
    save: (key) => electronAPI.saveKey(key),
    remove: (keyId) => electronAPI.deleteKey(keyId),
  };
};

const createHistoryService = (): HistoryService => {
  const electronAPI = ensureElectronAPI();
  return {
    list: (filter) => electronAPI.getHistory(filter),
    save: (item) => electronAPI.saveHistoryItem(item),
    remove: (historyId) => electronAPI.deleteHistoryItem(historyId),
    clear: () => electronAPI.clearHistory(),
  };
};

const createChainService = (): ChainService => {
  const electronAPI = ensureElectronAPI();
  return {
    listTemplates: () => electronAPI.getChainTemplates(),
    saveTemplate: (template) => electronAPI.saveChainTemplate(template),
    updateTemplate: (template) => electronAPI.updateChainTemplate(template),
    removeTemplate: (templateId) => electronAPI.deleteChainTemplate(templateId),
    executeChain: (steps, inputText, templateId, templateName) =>
      electronAPI.executeChain(steps, inputText, templateId, templateName),
  };
};

const createHttpTemplateService = (): HttpTemplateService => {
  const electronAPI = ensureElectronAPI();
  return {
    list: () => electronAPI.getHttpTemplates(),
    save: (template) => electronAPI.saveHttpTemplate(template),
    update: (template) => electronAPI.updateHttpTemplate(template),
    remove: (templateId) => electronAPI.deleteHttpTemplate(templateId),
    useTemplate: (templateId, pathParams, queryParams) =>
      electronAPI.useHttpTemplate(templateId, pathParams, queryParams),
  };
};

const createCryptoService = (): CryptoService => {
  const electronAPI = ensureElectronAPI();
  return {
    encrypt: (text, publicKey, algorithm) =>
      electronAPI.encryptText(text, publicKey, algorithm),
    decrypt: (encryptedText, privateKey, algorithm) =>
      electronAPI.decryptText(encryptedText, privateKey, algorithm),
    generateKeyPair: (keySize) => electronAPI.generateRSAKeys(keySize),
  };
};

const createUpdateService = (): UpdateService => {
  const electronAPI = ensureElectronAPI();
  return {
    onAvailable: (callback) => electronAPI.onUpdateAvailable?.(callback),
    onDownloadProgress: (callback) => electronAPI.onDownloadProgress?.(callback),
    onDownloaded: (callback) => electronAPI.onUpdateDownloaded?.(callback),
    onError: (callback) => electronAPI.onUpdateError?.(callback),
    removeAll: () => electronAPI.removeUpdateListeners?.(),
    checkForUpdates: () => electronAPI.checkForUpdates?.(),
    startDownload: () => electronAPI.startDownload?.(),
    restartAndInstall: () => electronAPI.restartAndInstall?.(),
  };
};

export const electronServices: PlatformServices = {
  environment: 'electron',
  key: createKeyService(),
  history: createHistoryService(),
  chain: createChainService(),
  httpTemplate: createHttpTemplateService(),
  crypto: createCryptoService(),
  update: createUpdateService(),
};
