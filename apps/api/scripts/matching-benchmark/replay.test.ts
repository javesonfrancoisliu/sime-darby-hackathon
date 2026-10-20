import { describe, expect, it, vi } from "vitest";
import { replaySavedResponses } from "./replay";

describe("saved Claude explanation regression corpus", () => {
  it("preserves all 15 rankings/scores and repairs known issues without inference", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("No live requests permitted"));
    try {
      const report = await replaySavedResponses();
      expect(fetch).not.toHaveBeenCalled();
      expect(report).toMatchObject({
        liveRequests: 0,
        newTokenUsage: 0,
        sourceResponses: 15,
        rankingsAndScoresUnchanged: true,
      });
      expect(report.metrics).toMatchObject({ strictValidityRate: 1, top1Accuracy: 1 });
      expect(report.metrics.ndcgAt5).toBeCloseTo(0.9981414146541955);
      for (const row of report.results)
        for (const match of row.matches) expect(match.reason.length).toBeLessThanOrEqual(240);
      for (const id of ["scenario-13", "scenario-14"]) {
        expect(
          report.results
            .find((r) => r.scenarioId === id)!
            .treatments.find((r) => r.candidate === "c3")!.treatment,
        ).toBe("unchanged");
      }
      for (const id of [
        "scenario-01",
        "scenario-02",
        "scenario-05",
        "scenario-08",
        "scenario-10",
      ]) {
        expect(
          report.results
            .find((r) => r.scenarioId === id)!
            .treatments.find((r) => r.candidate === "c3")!.treatment,
        ).toBe("rule-replacement");
      }
      expect(
        report.results
          .find((r) => r.scenarioId === "scenario-12")!
          .treatments.every((r) => r.treatment === "rule-replacement"),
      ).toBe(true);
    } finally {
      fetch.mockRestore();
    }
  });
});
