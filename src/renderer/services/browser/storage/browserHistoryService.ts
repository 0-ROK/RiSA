import { HistoryFilter, HistoryItem } from '../../../../shared/types';
import { HistoryService } from '../../../../shared/services/types';
import {
  DATA_EXPIRATION_MS,
  STORAGE_KEYS,
  getRegisteredExpiration,
  isFiniteNumber,
  isRecord,
  readCollection,
  reviveDate,
  writeCollection,
} from './browserStorageCommon';

const reviveHistoryItem = (raw: unknown): HistoryItem => {
  if (!isRecord(raw)) {
    throw new Error('Invalid history record');
  }
  const record = raw as Record<string, unknown>;
  const base = raw as unknown as HistoryItem;
  return {
    ...base,
    timestamp: reviveDate(record.timestamp),
  };
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

const resolveHistoryExpiresAt = (item: HistoryItem): number | undefined => {
  const registered = getRegisteredExpiration(item);
  if (isFiniteNumber(registered)) {
    return registered;
  }
  if (isFiniteNumber((item as unknown as Record<string, unknown>).expiresAt)) {
    return (item as unknown as Record<string, unknown>).expiresAt as number;
  }
  const timestamp = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
  const value = timestamp.getTime();
  return Number.isNaN(value) ? undefined : value + DATA_EXPIRATION_MS;
};

export const loadHistory = async (): Promise<HistoryItem[]> =>
  readCollection<HistoryItem>(STORAGE_KEYS.history, reviveHistoryItem);

export const browserHistoryService: HistoryService = {
  async list(filter) {
    const history = await loadHistory();
    return history.filter(item => matchesFilter(item, filter));
  },
  async save(item) {
    const history = await loadHistory();
    history.unshift(item);
    writeCollection(STORAGE_KEYS.history, history, resolveHistoryExpiresAt);
  },
  async remove(historyId) {
    const history = await loadHistory();
    writeCollection(
      STORAGE_KEYS.history,
      history.filter(item => item.id !== historyId),
      resolveHistoryExpiresAt,
    );
  },
  async clear() {
    writeCollection(STORAGE_KEYS.history, []);
  },
};
