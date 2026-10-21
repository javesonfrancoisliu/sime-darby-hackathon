import { describe, expect, it } from "vitest";

import {
  formatCount,
  formatDate,
  formatDateTimeRange,
  formatReadingValue,
  formatRelative,
  formatWhen,
} from "./format";

describe("unreadable dates", () => {
  it("renders an empty string instead of throwing", () => {
    expect(formatDate("not a date")).toBe("");
    expect(formatWhen("")).toBe("");
    expect(formatRelative("garbage")).toBe("");
  });
});

describe("format helpers", () => {
  it("shows the year in a when label", () => {
    expect(formatWhen("2030-06-01T15:00:00Z")).toBe("Sat 1 Jun 2030, 11:00 pm");
  });

  it("shows a same-day window with the date once", () => {
    expect(formatDateTimeRange("2026-10-17T01:00:00Z", "2026-10-17T05:00:00Z")).toBe(
      "17 Oct 2026, 9:00 am – 1:00 pm",
    );
  });

  it("keeps both dates when the window crosses midnight", () => {
    expect(formatDateTimeRange("2026-10-17T10:00:00Z", "2026-10-18T05:00:00Z")).toBe(
      "17 Oct 2026, 6:00 pm – 18 Oct 2026, 1:00 pm",
    );
  });

  it("adds thousands separators", () => {
    expect(formatCount(10000)).toBe("10,000");
  });

  it("writes temperatures with the degree sign whatever the unit spelling", () => {
    expect(formatReadingValue(34, "C")).toBe("34°C");
    expect(formatReadingValue(34, "°C")).toBe("34°C");
    expect(formatReadingValue(62, "AQI")).toBe("62 AQI");
  });
});
