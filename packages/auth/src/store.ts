// Tokens live in one localStorage key so every app on this origin shares one sign-in.

export const AUTH_STORAGE_KEY = "hn.auth.session";

export type StoredSession = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  // Epoch milliseconds when the access token stops working.
  expiresAt: number;
};

function isSession(value: unknown): value is StoredSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.accessToken === "string" &&
    typeof v.idToken === "string" &&
    typeof v.refreshToken === "string" &&
    typeof v.expiresAt === "number"
  );
}

export function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked: the sign-in just won't survive a reload.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was persisted, so nothing to clear.
  }
}
