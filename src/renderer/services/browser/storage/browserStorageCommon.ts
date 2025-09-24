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

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const sanitizeItems = <T>(items: T[]): T[] =>
  items.map(item => {
    if (isRecord(item)) {
      const clone = { ...item } as Record<string, unknown>;
      delete clone.expiresAt;
      return clone as unknown as T;
    }
    return item;
  });

export const writeCollection = <T>(key: string, value: T[]): void => {
  const sanitized = sanitizeItems(value);
  getStorage().setItem(key, JSON.stringify(sanitized));
};

export const readCollection = <T>(key: string, revive?: (raw: unknown) => T): T[] => {
  try {
    const raw = getStorage().getItem(key);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const result: T[] = [];
    let requiresRewrite = false;

    parsed.forEach(entry => {
      let rawValue = entry;
      if (isRecord(entry) && 'value' in entry) {
        rawValue = (entry as Record<string, unknown>).value;
        requiresRewrite = true;
      }

      try {
        const value = revive ? revive(rawValue) : (rawValue as T);
        if (isRecord(value)) {
          delete (value as Record<string, unknown>).expiresAt;
        }
        result.push(value);
      } catch {
        requiresRewrite = true;
      }
    });

    if (requiresRewrite) {
      writeCollection(key, result);
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
