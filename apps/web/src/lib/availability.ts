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
