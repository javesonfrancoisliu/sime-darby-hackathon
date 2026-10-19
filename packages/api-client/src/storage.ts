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

// Scope suffix for the signed-out offline demo. It survives sign-in and sign-out.
export const SIGNED_OUT_SCOPE = "signed-out";

// Keys an app namespaces per user. Each is stored as `${base}:${userId}` and is
// removed for every signed-in user when the session signs out. The signed-out
// scope is kept; the old un-suffixed key is dropped as leftover from before scoping.
const scopedBases = new Set<string>();

export function registerScopedKey(base: string): (userId: string) => string {
  scopedBases.add(base);
  return (userId) => `${base}:${userId}`;
}

function isDoomed(key: string, base: string): boolean {
  if (key === base) return true;
  return key.startsWith(`${base}:`) && key !== `${base}:${SIGNED_OUT_SCOPE}`;
}

export function clearScopedKeys(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && [...scopedBases].some((base) => isDoomed(key, base))) doomed.push(key);
    }
    for (const key of doomed) window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing was persisted, so nothing to clear.
  }
}
