import { describe, expect, it } from "vitest";
import {
  CompleteRequestBody,
  CreateRequestBody,
  HelpRequestSummary,
  RequestsQuery,
  ReviewRequestBody,
} from "./index";

const base = {
  category: "groceries",
  title: "  Weekly shopping ",
  scheduledAt: "2026-11-01T10:00:00+08:00",
  durationMinutes: 60,
  location: { lat: 3.07, lng: 101.51, area: "Precinct 1" },
};

describe("CreateRequestBody", () => {
  it("trims the title and defaults the description", () => {
    expect(CreateRequestBody.parse(base)).toMatchObject({
      title: "Weekly shopping",
      description: "",
    });
  });

  it("rejects out-of-range durations and empty or long titles", () => {
    expect(CreateRequestBody.safeParse({ ...base, durationMinutes: 10 }).success).toBe(false);
    expect(CreateRequestBody.safeParse({ ...base, durationMinutes: 181 }).success).toBe(false);
    expect(CreateRequestBody.safeParse({ ...base, title: "   " }).success).toBe(false);
    expect(CreateRequestBody.safeParse({ ...base, title: "x".repeat(81) }).success).toBe(false);
  });

  it("requires a place with an area and a valid timestamp", () => {
    expect(CreateRequestBody.safeParse({ ...base, location: { lat: 1, lng: 1 } }).success).toBe(
      false,
    );
    expect(CreateRequestBody.safeParse({ ...base, scheduledAt: "tomorrow" }).success).toBe(false);
  });
});

describe("other bodies", () => {
  it("validates review, completion and query shapes", () => {
    expect(ReviewRequestBody.safeParse({ decision: "maybe" }).success).toBe(false);
    expect(
      ReviewRequestBody.safeParse({ decision: "approved", note: "x".repeat(301) }).success,
    ).toBe(false);
    expect(CompleteRequestBody.safeParse({ minutesSpent: 0 }).success).toBe(false);
    expect(CompleteRequestBody.safeParse({ minutesSpent: 601 }).success).toBe(false);
    expect(RequestsQuery.safeParse({ status: "bogus" }).success).toBe(false);
    expect(RequestsQuery.parse({})).toEqual({});
  });

  it("keeps private fields out of the summary shape", () => {
    expect(HelpRequestSummary.shape).toHaveProperty("distanceKm");
    expect(HelpRequestSummary.shape).toHaveProperty("area");
    expect(HelpRequestSummary.shape).not.toHaveProperty("location");
    expect(HelpRequestSummary.shape).not.toHaveProperty("elderName");
  });
});
