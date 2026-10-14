import { describe, expect, it } from "vitest";
import { OpportunitiesQuery } from "./index";

describe("OpportunitiesQuery", () => {
  it("coerces query-string values", () => {
    expect(OpportunitiesQuery.parse({ radiusKm: "3", fitsMySchedule: "true" })).toEqual({
      radiusKm: 3,
      fitsMySchedule: true,
    });
  });

  it("rejects an out-of-range radius and an unknown category", () => {
    expect(OpportunitiesQuery.safeParse({ radiusKm: "100" }).success).toBe(false);
    expect(OpportunitiesQuery.safeParse({ radiusKm: "0.7" }).success).toBe(false);
    expect(OpportunitiesQuery.safeParse({ category: "juggling" }).success).toBe(false);
  });
});
