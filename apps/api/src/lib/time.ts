const KL_OFFSET_MS = 8 * 60 * 60 * 1000;

// UTC ISO 8601 with a Z suffix; the only form services store.
export const nowIso = (): string => new Date().toISOString();

// Normalises any ISO instant (any offset) to UTC Z. Throws RangeError on an invalid date.
export const toUtc = (iso: string): string => new Date(iso).toISOString();

// Calendar date (YYYY-MM-DD) in Malaysia time (UTC+8, no DST) for an instant.
export const klDate = (iso: string): string =>
  new Date(Date.parse(iso) + KL_OFFSET_MS).toISOString().slice(0, 10);
