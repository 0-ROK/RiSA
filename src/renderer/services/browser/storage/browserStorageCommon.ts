// Browser-specific storage utilities shared across web demo services.

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const memoryStorage = (() => {
  const store = new Map<string, string>();
  const storage: StorageLike = {
    getItem: key => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: key => {
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

export const STORAGE_KEYS = {
  keys: 'risa.keys',
  history: 'risa.history',
  chainTemplates: 'risa.chainTemplates',
  httpTemplates: 'risa.httpTemplates',
} as const;

export const DATA_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

type StoredItem<T> = {
  value: T;
  expiresAt: number;
};

export const DEFAULT_EXPIRES_AT = () => Date.now() + DATA_EXPIRATION_MS;

const expirationRegistry = new WeakMap<object, number>();

export const registerExpiration = (value: unknown, expiresAt: number): void => {
  if (isRecord(value)) {
    expirationRegistry.set(value as object, expiresAt);
  }
};

export const getRegisteredExpiration = (value: unknown): number | undefined => {
  if (isRecord(value)) {
    return expirationRegistry.get(value as object);
  }
  return undefined;
};

const writeStoredItems = <T>(key: string, items: StoredItem<T>[]): void => {
  getStorage().setItem(key, JSON.stringify(items));
};

export const writeCollection = <T>(
  key: string,
  value: T[],
  getExpiresAt: (item: T) => number | undefined = () => DEFAULT_EXPIRES_AT(),
): void => {
  const storedItems: StoredItem<T>[] = [];

  value.forEach(item => {
    const expiresAt = getExpiresAt(item);
    if (!isFiniteNumber(expiresAt)) {
      return;
    }
    if (isRecord(item)) {
      (item as Record<string, unknown>).expiresAt = expiresAt;
    }
    registerExpiration(item, expiresAt);
    storedItems.push({ value: item, expiresAt });
  });

  writeStoredItems(key, storedItems);
};

interface ParsedEntry<T> {
  item: StoredItem<T>;
  needsMigration: boolean;
}

const parseStoredEntry = <T>(
  entry: unknown,
  revive: ((raw: unknown) => T) | undefined,
  now: number,
): ParsedEntry<T> | null => {
  let rawValue: unknown;
  let expiresAt: number | undefined;
  let needsMigration = false;

  if (isRecord(entry) && 'value' in entry) {
    const record = entry as Record<string, unknown>;
    rawValue = record.value;

    if (isFiniteNumber(record.expiresAt)) {
      expiresAt = record.expiresAt;
    } else if (isFiniteNumber(record.createdAt)) {
      expiresAt = record.createdAt + DATA_EXPIRATION_MS;
      needsMigration = true;
    } else {
      needsMigration = true;
    }
  } else {
    rawValue = entry;
    needsMigration = true;
  }

  let value: T;
  try {
    value = revive ? revive(rawValue) : (rawValue as T);
  } catch {
    return null;
  }

  if (!isFiniteNumber(expiresAt) || expiresAt < now) {
    return null;
  }

  if (isRecord(value)) {
    (value as Record<string, unknown>).expiresAt = expiresAt;
  }
  return {
    item: { value, expiresAt },
    needsMigration,
  };
};

export const readCollection = <T>(key: string, revive?: (raw: unknown) => T): T[] => {
  try {
    const raw = getStorage().getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    const migratedItems: StoredItem<T>[] = [];
    const result: T[] = [];
    let requiresRewrite = false;

    const entries: unknown[] = parsed;
    entries.forEach(entry => {
      const parsedEntry = parseStoredEntry(entry, revive, now);
      if (!parsedEntry) {
        requiresRewrite = true;
        return;
      }

      const { item, needsMigration } = parsedEntry;
      migratedItems.push(item);
      result.push(item.value);
      registerExpiration(item.value, item.expiresAt);
      if (needsMigration) {
        requiresRewrite = true;
      }
    });

    if (requiresRewrite) {
      writeStoredItems(key, migratedItems);
    }

    return result;
  } catch {
    return [];
  }
};

export const reviveDate = (value: unknown, fallback = new Date()): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date;
  }
  return fallback;
};
