import type { TaskCategory } from "./volunteer";

// Frontend-only Young-resident profile model. Mirrors fields from the shared
// @sdh/contracts User where they exist (name, area, skills, availability) and
// adds frontend-only fields (languages, interests) NOT yet in the backend
// contract. Persisted to localStorage for the demo — NOT saved to any backend.

export type PreferredDay = "weekdays" | "weekends";
export type TimeOfDay = "morning" | "afternoon" | "evening";

/**
 * Simplified availability preference. Designed to map later onto the backend
 * AvailabilitySlot[] (day + start/end): each selected day-group × time-of-day
 * can expand into concrete slots when real scheduling is wired.
 */
export type AvailabilityPreference = {
  days: PreferredDay[];
  times: TimeOfDay[];
};

export type Language = "en" | "ms" | "zh";

export type ProfilePrefs = {
  displayName: string;
  area: string;
  /** Volunteer skills — reuse the shared task categories. */
  skills: TaskCategory[];
  /** Preferred assistance interests — also task categories. */
  interests: TaskCategory[];
  availability: AvailabilityPreference;
  /** Preferred communication languages (frontend-only; not in the User contract). */
  languages: Language[];
};

export const LANGUAGE_LABEL: Record<Language, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  zh: "Mandarin",
};

export const PREFERRED_DAY_LABEL: Record<PreferredDay, string> = {
  weekdays: "Weekdays",
  weekends: "Weekends",
};

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};
