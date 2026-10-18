import type { Urgency } from "../types/volunteer";

const HOUR_MS = 3_600_000;

// A request is urgent only when it starts in the future, within this many hours.
export const URGENT_WITHIN_HOURS = 3;
// Starts later than urgent but within this many hours: "Soon". Anything further is flexible.
export const SOON_WITHIN_HOURS = 72;

// The single place that decides how time-sensitive an opportunity is, from its start time.
export function urgencyFor(startsAt: string, now: number = Date.now()): Urgency {
  const hoursAway = (Date.parse(startsAt) - now) / HOUR_MS;
  if (Number.isNaN(hoursAway) || hoursAway < 0) return "low";
  if (hoursAway <= URGENT_WITHIN_HOURS) return "high";
  if (hoursAway <= SOON_WITHIN_HOURS) return "medium";
  return "low";
}
