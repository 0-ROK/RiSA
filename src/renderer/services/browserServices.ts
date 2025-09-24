import { PlatformServices } from '../../shared/services/types';
import { browserKeyService } from './browser/storage/browserKeyService';
import { browserHistoryService } from './browser/storage/browserHistoryService';
import { browserChainService } from './browser/browserChainService';
import { browserHttpTemplateService } from './browser/browserHttpTemplateService';
import { browserCryptoService } from './browser/browserCryptoService';

// Browser/web demo service bundle used when running without the Electron bridge.
export const browserServices: PlatformServices = {
  environment: 'web',
  key: browserKeyService,
  history: browserHistoryService,
  chain: browserChainService,
  httpTemplate: browserHttpTemplateService,
  crypto: browserCryptoService,
};
