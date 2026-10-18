import { describe, expect, it } from "vitest";
import { CreateRequestBody } from "@sdh/contracts";
import { ELDER } from "../test/fixtures";
import {
  buildCreateBody,
  formatWhen,
  isSlotPast,
  minutesLabel,
  slotIso,
  TIME_SLOTS,
} from "./schedule";

const [morning, afternoon, evening] = TIME_SLOTS as [
  (typeof TIME_SLOTS)[number],
  (typeof TIME_SLOTS)[number],
  (typeof TIME_SLOTS)[number],
];

describe("slots", () => {
  it("builds ISO times with the +08:00 offset", () => {
    const now = new Date("2026-10-19T03:00:00Z");
    expect(slotIso("today", morning, now)).toBe("2026-10-19T09:00:00+08:00");
    expect(slotIso("tomorrow", evening, now)).toBe("2026-10-20T18:00:00+08:00");
  });

  it("uses the Malaysia date, not the phone's date, near midnight", () => {
    // 17:30 UTC on the 19th is already 01:30 on the 20th in Malaysia.
    const now = new Date("2026-10-19T17:30:00Z");
    expect(slotIso("today", morning, now)).toBe("2026-10-20T09:00:00+08:00");
    expect(slotIso("tomorrow", morning, now)).toBe("2026-10-21T09:00:00+08:00");
  });

  it("rolls over a month end", () => {
    const now = new Date("2026-10-31T03:00:00Z");
    expect(slotIso("tomorrow", morning, now)).toBe("2026-11-01T09:00:00+08:00");
  });

  it("marks slots that have started as past, only today", () => {
    // 15:00 in Malaysia.
    const now = new Date("2026-10-19T07:00:00Z");
    expect(isSlotPast("today", morning, now)).toBe(true);
    expect(isSlotPast("today", afternoon, now)).toBe(true);
    expect(isSlotPast("today", evening, now)).toBe(false);
    expect(isSlotPast("tomorrow", morning, now)).toBe(false);
  });

  it("treats a slot starting this very minute as past", () => {
    const now = new Date("2026-10-19T06:00:00Z");
    expect(isSlotPast("today", afternoon, now)).toBe(true);
  });
});

describe("labels", () => {
  it("formats minutes plainly", () => {
    expect([30, 60, 90, 120].map(minutesLabel)).toEqual([
      "30 minutes",
      "1 hour",
      "90 minutes",
      "2 hours",
    ]);
  });

  it("formats a time in Malaysia time", () => {
    const text = formatWhen("2026-10-20T09:00:00+08:00");
    expect(text).toMatch(/20 Oct/);
    expect(text).toMatch(/9:00\s?am/i);
    expect(formatWhen("2026-10-20T01:00:00Z")).toMatch(/9:00\s?am/i);
  });
});

describe("buildCreateBody", () => {
  it("produces a body the contract accepts, with title from the category and home area", () => {
    const body = buildCreateBody({
      category: "home_help",
      description: "  Change a bulb  ",
      day: "tomorrow",
      slot: afternoon,
      durationMinutes: 90,
      resident: ELDER,
      now: new Date("2026-10-19T03:00:00Z"),
    });
    expect(CreateRequestBody.parse(body)).toEqual({
      category: "home_help",
      title: "Help at home",
      description: "Change a bulb",
      scheduledAt: "2026-10-20T14:00:00+08:00",
      durationMinutes: 90,
      location: { lat: ELDER.location.lat, lng: ELDER.location.lng, area: "Elmina Valley" },
    });
  });
});
