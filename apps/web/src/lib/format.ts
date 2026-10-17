// Date/time formatting for the UI. The design-system contract requires Malaysian
// local time (UTC+8). We format explicitly in that timezone so output is stable
// regardless of the viewer's machine timezone.
const KL_TIME_ZONE = "Asia/Kuala_Lumpur";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: KL_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: KL_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatTimeRange(startIso: string, durationMinutes: number): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const time = new Intl.DateTimeFormat("en-MY", {
    timeZone: KL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${time.format(start)} – ${time.format(end)}`;
}

/** Relative "updated" label, e.g. "Updated 2 days ago". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat("en-MY", { numeric: "auto" });

  const abs = Math.abs(diffMinutes);
  if (abs < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}
