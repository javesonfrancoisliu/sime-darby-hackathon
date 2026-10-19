import type { Paged } from "@sdh/contracts";
import { HttpError } from "./http";

export type LastKey = Record<string, string>;

const KEY_PATTERN = /^(PK|SK|GSI[1-3]PK|GSI[1-3]SK)$/;
const MAX_KEY_ENTRIES = 6;

export function encodeCursor(lastKey: Record<string, unknown> | undefined): string | undefined {
  if (!lastKey) return undefined;
  return Buffer.from(JSON.stringify(lastKey)).toString("base64url");
}

// Validates shape: only key attributes with string values, and every `scope` attribute must match,
// so a cursor from one list or user cannot be replayed against another.
export function decodeCursor(cursor: string | undefined, scope: LastKey = {}): LastKey | undefined {
  if (cursor === undefined) return undefined;
  const invalid = () => new HttpError("VALIDATION_FAILED", "cursor: invalid");
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw invalid();
  const entries = Object.entries(parsed);
  if (entries.length === 0 || entries.length > MAX_KEY_ENTRIES) throw invalid();
  for (const [name, value] of entries) {
    if (!KEY_PATTERN.test(name) || typeof value !== "string") throw invalid();
  }
  const key = Object.fromEntries(entries) as LastKey;
  if (!("PK" in key) || !("SK" in key)) throw invalid();
  for (const [name, expected] of Object.entries(scope)) {
    if (key[name] !== expected) throw invalid();
  }
  return key;
}

export function toPaged<T>(items: T[], lastKey: Record<string, unknown> | undefined): Paged<T> {
  const nextCursor = encodeCursor(lastKey);
  return nextCursor ? { items, nextCursor } : { items };
}
