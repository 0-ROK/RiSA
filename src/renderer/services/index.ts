import { PlatformServices } from '../../shared/services/types';
import { electronServices } from './electronServices';

let cachedServices: PlatformServices | null = null;

export const getPlatformServices = (): PlatformServices => {
  if (!cachedServices) {
    cachedServices = electronServices;
  }
  return cachedServices;
};

export const setPlatformServices = (services: PlatformServices): void => {
  cachedServices = services;
};
