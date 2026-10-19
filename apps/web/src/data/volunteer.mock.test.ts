import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { urgencyFor } from "../lib/urgency";
import { URGENCY_RANK } from "../types/volunteer";

// Loads the demo feed as if the page was opened at the given time.
async function loadMockAt(iso: string) {
  vi.setSystemTime(new Date(iso));
  vi.resetModules();
  return (await import("./volunteer.mock")).MOCK_OPPORTUNITIES;
}

describe("demo opportunities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["2026-10-18T22:00:00+08:00", "2026-10-20T10:00:00+08:00", "2027-03-02T06:10:00+08:00"])(
    "is upcoming and has an urgent item when opened at %s",
    async (openedAt) => {
      const mocks = await loadMockAt(openedAt);
      const now = Date.now();
      const urgencies = mocks.map((o) => urgencyFor(o.scheduledAt, now));

      expect(urgencies).not.toContain("past");
      expect(urgencies).toContain("high");
      expect(urgencies).toContain("medium");
      expect(urgencies).toContain("low");
    },
  );

  it("puts the urgent item first under the urgency order", async () => {
    const mocks = await loadMockAt("2026-10-20T10:00:00+08:00");
    const now = Date.now();
    const ranked = [...mocks].sort(
      (a, b) =>
        URGENCY_RANK[urgencyFor(a.scheduledAt, now)] - URGENCY_RANK[urgencyFor(b.scheduledAt, now)],
    );

    expect(urgencyFor(ranked[0]!.scheduledAt, now)).toBe("high");
  });

  it("moves an item to Started once the clock passes its start", async () => {
    const mocks = await loadMockAt("2026-10-20T10:00:00+08:00");
    const first = mocks[0]!;
    const later = Date.now() + 4 * 3_600_000;

    expect(urgencyFor(first.scheduledAt, Date.now())).toBe("high");
    expect(urgencyFor(first.scheduledAt, later)).toBe("past");
  });
});
