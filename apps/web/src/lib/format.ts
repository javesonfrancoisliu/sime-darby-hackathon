// Date/time formatting for the UI. The design-system contract requires Malaysian
// local time (UTC+8). We format explicitly in that timezone so output is stable
// regardless of the viewer's machine timezone.
const KL_TIME_ZONE = "Asia/Kuala_Lumpur";

// A Date for the text, or null when it cannot be read (Intl would throw a RangeError on it).
export function safeDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso: string): string {
  const date = safeDate(iso);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: KL_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
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

// A date-time range; when both ends fall on the same day the date is shown once.
export function formatDateTimeRange(startIso: string, endIso: string): string {
  const day = new Intl.DateTimeFormat("en-MY", {
    timeZone: KL_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (day.format(new Date(startIso)) !== day.format(new Date(endIso))) {
    return `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`;
  }
  const time = new Intl.DateTimeFormat("en-MY", {
    timeZone: KL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${formatDateTime(startIso)} – ${time.format(new Date(endIso))}`;
}

// A whole number with thousands separators, e.g. 10,000.
export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-MY").format(n);
}

// A reading with its unit; temperatures read "34°C" however the unit arrives ("C" or "°C").
export function formatReadingValue(value: number, unit: string): string {
  return /^°?C$/.test(unit.trim()) ? `${value}°C` : `${value} ${unit}`;
}

// A reading value with its unit. Units that start with "°" or equal "%" hug the
// number ("34°C", "70%"); everything else keeps a space ("62 AQI").
export function withUnit(value: number, unit: string): string {
  return unit.startsWith("°") || unit === "%" ? `${value}${unit}` : `${value} ${unit}`;
}

// Temperatures always read "34°C" however the Celsius unit arrives.
const CELSIUS_UNITS = new Set(["°c", "c", "℃", "°", "º", "º c", "° c", "deg c", "celsius"]);

export function formatTemperature(value: number, unit: string): string {
  return CELSIUS_UNITS.has(unit.trim().toLowerCase()) ? `${value}°C` : withUnit(value, unit);
}

// For example "Mon 19 Oct, 8:30 am", in Malaysia time.
const whenDateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: KL_TIME_ZONE,
});
const whenTimeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: KL_TIME_ZONE,
});

export function formatWhen(iso: string): string {
  const date = safeDate(iso);
  if (!date) return "";
  return `${whenDateFormat.format(date).replace(",", "")}, ${whenTimeFormat.format(date)}`;
}

// Relative "updated" label, e.g. "Updated 2 days ago".
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = safeDate(iso);
  if (!then) return "";
  const diffMs = then.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat("en-MY", { numeric: "auto" });

  const abs = Math.abs(diffMinutes);
  if (abs < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}
