import { describe, expect, it } from "vitest";
import { klDate, nowIso, toUtc } from "./time";

describe("time helpers", () => {
  it("nowIso is UTC with a Z suffix", () => {
    expect(nowIso()).toMatch(/Z$/);
  });

  it("toUtc normalises offsets to Z", () => {
    expect(toUtc("2026-10-19T08:00:00+08:00")).toBe("2026-10-19T00:00:00.000Z");
  });

  it("klDate rolls over at 16:00 UTC", () => {
    expect(klDate("2026-10-19T15:59:59Z")).toBe("2026-10-19");
    expect(klDate("2026-10-19T16:00:00Z")).toBe("2026-10-20");
    expect(klDate("2026-10-19T23:30:00+08:00")).toBe("2026-10-19");
  });
});
