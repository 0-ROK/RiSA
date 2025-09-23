import { PlatformServices } from '../../shared/services/types';
import { electronServices } from './electronServices';
import { browserServices } from './browserServices';

let cachedServices: PlatformServices | null = null;

const detectPlatform = (): PlatformServices => {
  if (typeof window === 'undefined') {
    return browserServices;
  }

  if ((window as any).electronAPI) {
    return electronServices;
  }

  return browserServices;
};

export const getPlatformServices = (): PlatformServices => {
  if (!cachedServices) {
    cachedServices = detectPlatform();
  }
  return cachedServices;
};

export const setPlatformServices = (services: PlatformServices): void => {
  cachedServices = services;
};
