import type { AvailabilitySlot, Day } from "@sdh/contracts";

import {
  PREFERRED_DAYS,
  TIMES_OF_DAY,
  type AvailabilityPreference,
  type PreferredDay,
  type TimeOfDay,
} from "../types/profile";

// The profile screen asks for day groups and times of day; the API stores
// weekly slots. These two functions convert between the shapes.

const DAYS_BY_GROUP: Record<PreferredDay, Day[]> = {
  weekdays: ["mon", "tue", "wed", "thu", "fri"],
  weekends: ["sat", "sun"],
};

const WINDOW_BY_TIME: Record<TimeOfDay, { start: string; end: string }> = {
  morning: { start: "08:00", end: "12:00" },
  afternoon: { start: "12:00", end: "17:00" },
  evening: { start: "17:00", end: "21:00" },
};

export function preferenceToSlots(pref: AvailabilityPreference): AvailabilitySlot[] {
  return pref.days.flatMap((group) =>
    DAYS_BY_GROUP[group].flatMap((day) =>
      pref.times.map((time) => ({ day, ...WINDOW_BY_TIME[time] })),
    ),
  );
}

function timeOfDayFor(start: string): TimeOfDay {
  const match = TIMES_OF_DAY.find(
    (time) => start >= WINDOW_BY_TIME[time].start && start < WINDOW_BY_TIME[time].end,
  );
  return match ?? (start < WINDOW_BY_TIME.morning.start ? "morning" : "evening");
}

export function slotsToPreference(slots: AvailabilitySlot[]): AvailabilityPreference {
  const days = new Set<PreferredDay>();
  const times = new Set<TimeOfDay>();
  for (const slot of slots) {
    for (const group of PREFERRED_DAYS) {
      if (DAYS_BY_GROUP[group].includes(slot.day)) days.add(group);
    }
    times.add(timeOfDayFor(slot.start));
  }
  return { days: [...days], times: [...times] };
}

const DAY_ORDER: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL: Record<Day, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const slotKey = (slot: AvailabilitySlot) => `${slot.day} ${slot.start} ${slot.end}`;

// True when the stored slots are exactly what the day-group and time-of-day choices produce.
export function slotsMatchPreference(slots: AvailabilitySlot[]): boolean {
  const expected = new Set(preferenceToSlots(slotsToPreference(slots)).map(slotKey));
  const stored = new Set(slots.map(slotKey));
  return expected.size === stored.size && [...stored].every((key) => expected.has(key));
}

// One readable line per stored slot, in week order, e.g. "Mon 09:00 to 11:00".
export function describeSlots(slots: AvailabilitySlot[]): string[] {
  return [...slots]
    .sort(
      (a, b) =>
        DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start.localeCompare(b.start),
    )
    .map((slot) => `${DAY_LABEL[slot.day]} ${slot.start} to ${slot.end}`);
}
