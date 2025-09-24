import { SavedKey } from '../../../../shared/types';
import { KeyService } from '../../../../shared/services/types';
import {
  DATA_EXPIRATION_MS,
  getRegisteredExpiration,
  isFiniteNumber,
  isRecord,
  readCollection,
  reviveDate,
  writeCollection,
  STORAGE_KEYS,
} from './browserStorageCommon';

const reviveSavedKey = (raw: unknown): SavedKey => {
  if (!isRecord(raw)) {
    throw new Error('Invalid saved key record');
  }
  const record = raw as Record<string, unknown>;
  const base = raw as unknown as SavedKey;
  return {
    ...base,
    created: reviveDate(record.created),
  };
};

const resolveKeyExpiresAt = (key: SavedKey): number | undefined => {
  const registered = getRegisteredExpiration(key);
  if (isFiniteNumber(registered)) {
    return registered;
  }
  if (isFiniteNumber((key as unknown as Record<string, unknown>).expiresAt)) {
    return (key as unknown as Record<string, unknown>).expiresAt as number;
  }
  const created = key.created instanceof Date ? key.created : new Date(key.created);
  const timestamp = created.getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp + DATA_EXPIRATION_MS;
};

export const loadKeys = async (): Promise<SavedKey[]> =>
  readCollection<SavedKey>(STORAGE_KEYS.keys, reviveSavedKey);

export const browserKeyService: KeyService = {
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
    writeCollection(STORAGE_KEYS.keys, keys, resolveKeyExpiresAt);
  },
  async remove(keyId) {
    const keys = await loadKeys();
    const filtered = keys.filter(key => key.id !== keyId);
    writeCollection(STORAGE_KEYS.keys, filtered, resolveKeyExpiresAt);
  },
};
