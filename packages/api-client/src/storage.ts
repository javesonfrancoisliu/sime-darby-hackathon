// Storage helpers that never throw: private mode and blocked site data make
// localStorage access throw, and the app must keep working without it.

export const DEMO_USER_STORAGE_KEY = "tc.demoUserId";

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the value just won't survive a reload.
  }
}

export function storedDemoUserId(): string | null {
  if (typeof window === "undefined") return null;
  return readStorage(DEMO_USER_STORAGE_KEY);
}

// Keys an app namespaces per user. Each is stored as `${base}:${userId}` and is
// removed for every user when the session signs out.
const scopedBases = new Set<string>();

export function registerScopedKey(base: string): (userId: string) => string {
  scopedBases.add(base);
  return (userId) => `${base}:${userId}`;
}

export function clearScopedKeys(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && [...scopedBases].some((base) => key.startsWith(`${base}:`))) doomed.push(key);
    }
    for (const key of doomed) window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing was persisted, so nothing to clear.
  }
}
