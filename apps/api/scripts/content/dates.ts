// Malaysia local time, `days` from today at `hour`, returned as UTC ISO so content never goes stale.
export function at(days: number, hour: number, minute = 0, now: number = Date.now()): string {
  const myt = new Date(now + 8 * 3600_000);
  myt.setUTCDate(myt.getUTCDate() + days);
  myt.setUTCHours(hour, minute, 0, 0);
  return new Date(myt.getTime() - 8 * 3600_000).toISOString();
}

// A moment `hours` before now, for readings that were just measured.
export function hoursAgo(hours: number, now: number = Date.now()): string {
  return new Date(now - hours * 3600_000).toISOString();
}
