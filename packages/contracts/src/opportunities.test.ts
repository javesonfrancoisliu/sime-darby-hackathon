import { describe, expect, it } from "vitest";
import { OpportunitiesQuery, Opportunity } from "./index";

describe("OpportunitiesQuery", () => {
  it("validates personalized source/rank metadata without accepting invented AI scores", () => {
    const schema = Opportunity.options[0];
    expect(schema.shape.matchSource.safeParse("ai").success).toBe(true);
    expect(schema.shape.matchSource.safeParse("global").success).toBe(false);
    expect(schema.shape.matchRank.safeParse(0).success).toBe(false);
    expect(schema.shape.matchScore.safeParse(101).success).toBe(false);
    expect(schema.shape.matchSource.safeParse(undefined).success).toBe(true);
    for (const variant of Opportunity.options) {
      expect(variant.shape.reasons.safeParse(["x".repeat(240)]).success).toBe(true);
      expect(variant.shape.reasons.safeParse(["x".repeat(241)]).success).toBe(false);
      expect(variant.shape.explanationSource.safeParse("ai").success).toBe(true);
      expect(variant.shape.explanationSource.safeParse("rules").success).toBe(true);
      expect(variant.shape.explanationSource.safeParse(undefined).success).toBe(true);
      expect(variant.shape.explanationSource.safeParse("invented").success).toBe(false);
    }
  });
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
