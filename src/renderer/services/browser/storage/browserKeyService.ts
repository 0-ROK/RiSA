import { SavedKey } from '../../../../shared/types';
import { KeyService } from '../../../../shared/services/types';
import {
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
    writeCollection(STORAGE_KEYS.keys, keys);
  },
  async remove(keyId) {
    const keys = await loadKeys();
    const filtered = keys.filter(key => key.id !== keyId);
    writeCollection(STORAGE_KEYS.keys, filtered);
  },
};
