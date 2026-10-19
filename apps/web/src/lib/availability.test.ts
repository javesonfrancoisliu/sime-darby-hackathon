import { describe, expect, it } from "vitest";

import { preferenceToSlots, slotsToPreference } from "./availability";

describe("availability conversion", () => {
  it("expands day groups and times into weekly slots", () => {
    const slots = preferenceToSlots({ days: ["weekends"], times: ["morning", "evening"] });
    expect(slots).toEqual([
      { day: "sat", start: "08:00", end: "12:00" },
      { day: "sat", start: "17:00", end: "21:00" },
      { day: "sun", start: "08:00", end: "12:00" },
      { day: "sun", start: "17:00", end: "21:00" },
    ]);
  });

  it("returns no slots when either side is empty", () => {
    expect(preferenceToSlots({ days: [], times: ["morning"] })).toEqual([]);
    expect(preferenceToSlots({ days: ["weekdays"], times: [] })).toEqual([]);
  });

  it("stays within the API slot limit for the fullest choice", () => {
    const slots = preferenceToSlots({
      days: ["weekdays", "weekends"],
      times: ["morning", "afternoon", "evening"],
    });
    expect(slots).toHaveLength(21);
  });

  it("round-trips a preference", () => {
    const pref = { days: ["weekdays" as const], times: ["afternoon" as const] };
    expect(slotsToPreference(preferenceToSlots(pref))).toEqual(pref);
  });

  it("buckets slots saved with other hours by their start time", () => {
    const pref = slotsToPreference([
      { day: "mon", start: "06:30", end: "07:30" },
      { day: "sat", start: "13:15", end: "14:00" },
      { day: "sun", start: "19:00", end: "20:00" },
    ]);
    expect(pref.days.sort()).toEqual(["weekdays", "weekends"]);
    expect(pref.times.sort()).toEqual(["afternoon", "evening", "morning"]);
  });
});
