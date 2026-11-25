export function safeLoadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== typeof fallback) {
      window.localStorage.removeItem(key);
      return fallback;
    }
    if (typeof fallback === 'object' && !Array.isArray(fallback) && fallback !== null) {
      return { ...fallback, ...(parsed as Record<string, unknown>) } as T;
    }
    return parsed as T;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors in restricted modes
    }
    return fallback;
  }
}

export function safeSaveStorage<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > 1_500_000) {
      return false;
    }
    window.localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}
