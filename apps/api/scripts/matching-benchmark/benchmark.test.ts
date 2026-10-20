import { MAX_REASON_LENGTH } from "@sdh/contracts";
import { describe, expect, it, vi } from "vitest";
import { DATASET_VERSION, scenarios } from "./dataset";
import { compare, compile, evaluate } from "./evaluate";
import { RankingInput } from "../../src/modules/matching/prompt";
import { ruleReason } from "../../src/modules/matching/scoring";

function oracleRun() {
  return {
    datasetVersion: DATASET_VERSION,
    provider: "test",
    model: "synthetic-oracle-not-a-model",
    runKind: "mock",
    records: scenarios.map((scenario) => {
      const { candidates, inputHash } = compile(scenario);
      return {
        scenarioId: scenario.id,
        inputHash,
        latencyMs: 10,
        output: JSON.stringify({
          ranking: scenario.expectedTiers.flat().map((id) => ({
            candidate: `c${candidates.findIndex((c) => c.volunteer.id === id) + 1}`,
            reason: "Relevant experience for this request.",
          })),
        }),
      };
    }),
  };
}

describe("offline matching benchmark", () => {
  it("accepts factual schedule times but flags unsupported qualifications and availability", () => {
    const run = oracleRun();
    const scenario = scenarios[0]!;
    const { candidates } = compile(scenario);
    run.records[0]!.output = JSON.stringify({
      ranking: candidates.map((candidate, i) => ({
        candidate: `c${i + 1}`,
        reason: ruleReason(candidate),
      })),
    });
    expect(evaluate(run).rows[0]?.safeConciseReasonRate).toBe(1);
    run.records[0]!.output = JSON.stringify({
      ranking: candidates.map((candidate, i) => ({
        candidate: `c${i + 1}`,
        reason: candidate.components.availability
          ? "Certified doctor"
          : "Available at the requested time",
      })),
    });
    expect(evaluate(run).rows[0]?.safeConciseReasonRate).toBe(0);
  });
  it("compares paired runs while exposing missing coverage and separating human scores", () => {
    const left = oracleRun(),
      right = oracleRun();
    right.records.pop();
    const reviewed = {
      ...left,
      records: left.records.map((r) => ({
        ...r,
        humanReview: {
          contextualUnderstanding: 3,
          explanationQuality: 4,
          grounding: 2,
          notes: "Synthetic test review",
        },
      })),
    };
    const comparison = compare(reviewed, right);
    expect(comparison.completeCoverage).toBe(false);
    expect(comparison.runs[0]?.summary).toMatchObject({
      humanReviews: 15,
      humanContextMean: 3,
      humanExplanationMean: 4,
      humanGroundingMean: 2,
    });
    expect(comparison.runs[1]?.summary.humanContextMean).toBeNull();
  });
  it("validates all fixtures and excludes ineligible candidates before preparing model input", () => {
    expect(scenarios).toHaveLength(15);
    expect(new Set(scenarios.map((s) => s.target.category)).size).toBe(6);
    for (const scenario of scenarios) {
      const { candidates, request } = compile(scenario);
      expect(candidates).toHaveLength(3);
      expect(candidates.map((c) => c.volunteer.id).sort()).toEqual(
        scenario.expectedTiers.flat().sort(),
      );
      expect(candidates.some((c) => scenario.excluded.includes(c.volunteer.id))).toBe(false);
      for (const v of scenario.volunteers) expect(JSON.stringify(request)).not.toContain(v.id);
      expect(JSON.stringify(request)).not.toContain(scenario.rationale);
    }
    expect(
      scenarios.filter((s) => compile(s).candidates[0]?.volunteer.id === s.expectedTiers[0]?.[0]),
    ).toHaveLength(3);
  });

  it("scores a synthetic correct ranking perfectly and does not infer unmeasured cost", () => {
    const report = evaluate(oracleRun());
    expect(report.summary).toMatchObject({
      top1Accuracy: 1,
      ndcgAt5: 1,
      pairwiseAccuracy: 1,
      strictValidityRate: 1,
      estimatedTotalUsd: null,
      humanReviews: 0,
    });
  });

  it("penalizes reversed order and missing records rather than silently ignoring them", () => {
    const run = oracleRun();
    run.records[0]!.output = JSON.stringify({
      ranking: RankingInput.parse(JSON.parse(run.records[0]!.output)).ranking.reverse(),
    });
    run.records.pop();
    const report = evaluate(run);
    expect(report.summary.top1Accuracy).toBeLessThan(1);
    expect(report.rows[0]?.pairwiseAccuracy).toBe(0);
    expect(report.rows.at(-1)).toMatchObject({
      observed: false,
      jsonValid: false,
      strictValid: false,
      top1Correct: false,
    });
  });

  it("distinguishes malformed JSON, schema failures, duplicates, unknown labels and long reasons", () => {
    const run = oracleRun();
    run.records[0]!.output = "{not-json";
    run.records[1]!.output = JSON.stringify({ ranking: "wrong" });
    run.records[2]!.output = JSON.stringify({
      ranking: [
        { candidate: "c99", reason: "Nearby" },
        { candidate: "c1", reason: "Nearby" },
        { candidate: "c1", reason: "Nearby" },
      ],
    });
    run.records[3]!.output = JSON.stringify({
      ranking: [{ candidate: "c1", reason: "x".repeat(MAX_REASON_LENGTH + 1) }],
    });
    const report = evaluate(run);
    expect(report.rows[0]?.jsonValid).toBe(false);
    expect(report.rows[1]).toMatchObject({ jsonValid: true, strictValid: false });
    expect(report.rows[2]).toMatchObject({
      unknownLabels: 1,
      duplicateLabels: 1,
      strictValid: false,
    });
    expect(report.rows[3]?.safeConciseReasonRate).toBe(0);
  });

  it("rejects input drift and duplicate case records", () => {
    const run = oracleRun();
    run.records[0]!.inputHash = "changed";
    expect(() => evaluate(run)).toThrow(/mismatched/);
    const duplicate = oracleRun();
    duplicate.records[1] = duplicate.records[0]!;
    expect(() => evaluate(duplicate)).toThrow(/Duplicate/);
  });

  it("computes transparent costs only with known usage and rates", () => {
    const base = oracleRun();
    const run = {
      ...base,
      pricing: {
        asOf: "test-only",
        source: "synthetic test rates",
        inputUsdPerMillion: 0.1,
        outputUsdPerMillion: 0.5,
      },
      records: base.records.map((r) => ({ ...r, usage: { inputTokens: 1000, outputTokens: 100 } })),
    };
    expect(evaluate(run).summary.estimatedTotalUsd).toBeCloseTo(15 * 0.00015);
    expect(
      evaluate({
        ...run,
        records: run.records.map((r) => ({ ...r, usage: { ...r.usage, cacheReadTokens: 10 } })),
      }).summary.estimatedTotalUsd,
    ).toBeNull();
  });

  it("runs without any network requests", () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network forbidden"));
    try {
      evaluate(oracleRun());
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
});
