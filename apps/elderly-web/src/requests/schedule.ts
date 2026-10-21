import type { Category, CreateRequestBody, User } from "@sdh/contracts";
import { CATEGORY_TEXT } from "./categories";

// The township runs on Malaysia time, whatever the phone's own clock says.
const MY_OFFSET = "+08:00";
const MY_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Kuala_Lumpur";

export type DayChoice = "today" | "tomorrow";

export interface TimeSlot {
  id: "morning" | "afternoon" | "evening";
  label: string;
  hour: number;
  // Shown on the button, for example "9:00 am".
  clock: string;
}

export const TIME_SLOTS: TimeSlot[] = [
  { id: "morning", label: "Morning", hour: 9, clock: "9:00 am" },
  { id: "afternoon", label: "Afternoon", hour: 14, clock: "2:00 pm" },
  { id: "evening", label: "Evening", hour: 18, clock: "6:00 pm" },
];

export const DURATION_OPTIONS = [30, 60, 90, 120] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Today's calendar date in Malaysia, as YYYY-MM-DD.
export function malaysiaToday(now: Date = new Date()): string {
  return malaysiaDate(now, 0);
}

// Calendar date in Malaysia for an instant, shifted by whole days.
function malaysiaDate(now: Date, addDays: number): string {
  const shifted = new Date(now.getTime() + MY_OFFSET_MS + addDays * DAY_MS);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function slotIso(day: DayChoice, slot: TimeSlot, now: Date): string {
  return `${malaysiaDate(now, day === "today" ? 0 : 1)}T${pad(slot.hour)}:00:00${MY_OFFSET}`;
}

// A slot that has already started cannot be booked.
export function isSlotPast(day: DayChoice, slot: TimeSlot, now: Date): boolean {
  return Date.parse(slotIso(day, slot, now)) <= now.getTime();
}

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes === 60) return "1 hour";
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hours` : `${minutes} minutes`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});
const whenDateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TIME_ZONE,
});

const DATE_UNKNOWN = "Date to be confirmed";

// A Date for the text, or null when it cannot be read (Intl would throw a RangeError on it).
export function safeDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

// For example "Tue 20 Oct 2026, 9:00 am", in Malaysia time.
export function formatWhen(iso: string): string {
  const date = safeDate(iso);
  if (!date) return DATE_UNKNOWN;
  return `${whenDateFormat.format(date).replace(",", "")}, ${timeFormat.format(date)}`;
}

const longDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

// For example "20 Oct 2026", in Malaysia time.
export function formatDate(iso: string): string {
  const date = safeDate(iso);
  return date ? longDateFormat.format(date) : DATE_UNKNOWN;
}

// For example "Tue 20 Oct", in Malaysia time, with the year ("Tue 20 Oct 2027") when it is not
// the current year. Same style as formatWhen without the clock.
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const date = safeDate(iso);
  if (!date) return DATE_UNKNOWN;
  const otherYear = malaysiaDate(date, 0).slice(0, 4) !== malaysiaDate(now, 0).slice(0, 4);
  return (otherYear ? whenDateFormat : dateFormat).format(date).replace(",", "");
}

// For example "Tue 20 Oct 2026, 9:00 am to 5:00 pm", in Malaysia time.
export function formatWindow(startIso: string, endIso: string): string {
  const end = safeDate(endIso);
  if (!end || !safeDate(startIso)) return DATE_UNKNOWN;
  const sameDay = malaysiaDate(new Date(startIso), 0) === malaysiaDate(end, 0);
  return `${formatWhen(startIso)} to ${sameDay ? timeFormat.format(end) : formatWhen(endIso)}`;
}

export interface CreateChoices {
  category: Category;
  description: string;
  day: DayChoice;
  slot: TimeSlot;
  durationMinutes: number;
  resident: User;
  now: Date;
}

export function buildCreateBody(choices: CreateChoices): CreateRequestBody {
  const { category, description, day, slot, durationMinutes, resident, now } = choices;
  return {
    category,
    title: CATEGORY_TEXT[category],
    description: description.trim(),
    scheduledAt: slotIso(day, slot, now),
    durationMinutes,
    location: { lat: resident.location.lat, lng: resident.location.lng, area: resident.area },
  };
}
