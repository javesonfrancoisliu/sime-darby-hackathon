import { describe, expect, it } from "vitest";
import { CreateEventBody, EventCategory } from "./index";

const base = {
  title: "Tea and phone clinic",
  category: "digital_literacy",
  startsAt: "2026-11-01T10:00:00+08:00",
  durationMinutes: 90,
  location: { lat: 3.07, lng: 101.5, area: "Precinct 1" },
  capacity: 20,
};

describe("CreateEventBody", () => {
  it("defaults the description to empty", () => {
    expect(CreateEventBody.parse(base).description).toBe("");
  });

  it("rejects out-of-range duration and capacity", () => {
    expect(CreateEventBody.safeParse({ ...base, durationMinutes: 10 }).success).toBe(false);
    expect(CreateEventBody.safeParse({ ...base, durationMinutes: 500 }).success).toBe(false);
    expect(CreateEventBody.safeParse({ ...base, capacity: 0 }).success).toBe(false);
    expect(CreateEventBody.safeParse({ ...base, capacity: 501 }).success).toBe(false);
  });

  it("rejects a request-only category and a blank title", () => {
    expect(EventCategory.safeParse("groceries").success).toBe(false);
    expect(CreateEventBody.safeParse({ ...base, title: "   " }).success).toBe(false);
  });
});
