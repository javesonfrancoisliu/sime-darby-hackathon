import { describe, expect, it } from "vitest";

import { URGENT_WITHIN_HOURS, urgencyFor } from "./urgency";

const HOUR_MS = 3_600_000;
const NOW = Date.parse("2026-10-18T22:00:00+08:00");
const inHours = (h: number) => new Date(NOW + h * HOUR_MS).toISOString();

describe("urgencyFor", () => {
  it("is urgent for a request later today", () => {
    expect(urgencyFor(inHours(11), NOW)).toBe("high");
  });

  it("is urgent for a request 2 hours ahead", () => {
    expect(urgencyFor(inHours(2), NOW)).toBe("high");
  });

  it("is its own state once the start time has passed", () => {
    expect(urgencyFor(inHours(-1), NOW)).toBe("past");
  });

  it("is urgent exactly at the boundary and not just beyond it", () => {
    expect(urgencyFor(inHours(URGENT_WITHIN_HOURS), NOW)).toBe("high");
    expect(urgencyFor(inHours(URGENT_WITHIN_HOURS + 0.01), NOW)).toBe("medium");
  });

  it("is flexible when far ahead", () => {
    expect(urgencyFor(inHours(100), NOW)).toBe("low");
  });
});
