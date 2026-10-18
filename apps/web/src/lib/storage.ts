import { readStorage, registerScopedKey, writeStorage } from "@sdh/api-client";

// Per-user persisted state. Keys are `${base}:${userId}`, or `${base}:signed-out`
// for the offline demo, and the api-client removes all of them on sign-out.

const SIGNED_OUT = "signed-out";

export function scopedKey(base: string): (userId: string | null) => string {
  const keyFor = registerScopedKey(base);
  return (userId) => keyFor(userId ?? SIGNED_OUT);
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readStorage(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  writeStorage(key, JSON.stringify(value));
}
