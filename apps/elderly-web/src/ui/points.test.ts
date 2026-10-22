import { describe, expect, it } from "vitest";
import { formatPoints, pointsLabel } from "./points";

describe("points text", () => {
  it("groups large totals", () => {
    expect(formatPoints(100000000089)).toBe("100,000,000,089");
    expect(formatPoints(260)).toBe("260");
  });

  it("uses the singular for one", () => {
    expect(pointsLabel(1)).toBe("1 point");
    expect(pointsLabel(0)).toBe("0 points");
    expect(pointsLabel(1, "pt", "pts")).toBe("1 pt");
    expect(pointsLabel(1200, "pt", "pts")).toBe("1,200 pts");
  });
});
