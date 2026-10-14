import { describe, expect, it } from "vitest";
import { MatchesResponse } from "./index";

const match = {
  volunteerId: "3f6b1c1e-6d0a-4d6e-9f55-0c2f3a1b2c3d",
  name: "Aina",
  area: "Precinct 3",
  distanceKm: 1.2,
  score: 87,
  reason: "Has helped with groceries; 1.2 km away",
};

const parse = (rankedBy: string, score = match.score) =>
  MatchesResponse.safeParse({ rankedBy, matches: [{ ...match, score }] });

describe("MatchesResponse", () => {
  it("accepts a ranked list", () => {
    expect(parse("ai").success).toBe(true);
  });

  it("rejects a fractional or out-of-range score", () => {
    expect(parse("rules", 87.5).success).toBe(false);
    expect(parse("rules", 101).success).toBe(false);
  });

  it("rejects an unknown rankedBy value", () => {
    expect(parse("magic").success).toBe(false);
  });
});
