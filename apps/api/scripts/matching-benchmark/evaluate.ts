import { createHash } from "node:crypto";
import { z } from "zod";
import { MAX_REASON_LENGTH } from "@sdh/contracts";
import { buildMessageRequest, RankingInput } from "../../src/modules/matching/prompt";
import { rankVolunteers } from "../../src/modules/matching/scoring";
import { isSafeReason } from "../../src/modules/matching/claudeReranker";
import { DATASET_VERSION, scenarios, type Scenario } from "./dataset";

export function compile(scenario: Scenario) {
  const candidates = rankVolunteers(scenario.target, scenario.volunteers);
  const { model: _model, ...request } = buildMessageRequest(
    "offline-placeholder",
    scenario.target,
    candidates,
  );
  void _model;
  const inputHash = createHash("sha256")
    .update(JSON.stringify({ datasetVersion: DATASET_VERSION, scenarioId: scenario.id, request }))
    .digest("hex");
  return { candidates, request, inputHash };
}

const Rate = z.number().finite().nonnegative();
export const SavedRun = z.object({
  datasetVersion: z.literal(DATASET_VERSION),
  provider: z.string().min(1),
  model: z.string().min(1),
  runKind: z.enum(["rules", "mock", "live"]),
  pricing: z
    .object({
      asOf: z.string().min(1),
      source: z.string().min(1),
      inputUsdPerMillion: Rate,
      outputUsdPerMillion: Rate,
      cacheReadUsdPerMillion: Rate.optional(),
      cacheWriteUsdPerMillion: Rate.optional(),
    })
    .optional(),
  records: z
    .array(
      z.object({
        scenarioId: z.string(),
        inputHash: z.string(),
        /** Raw JSON text of tool arguments. Preserve malformed text; do not repair it. */
        output: z.string(),
        latencyMs: z.number().finite().nonnegative(),
        error: z.string().optional(),
        usage: z
          .object({
            inputTokens: z.number().int().nonnegative(),
            outputTokens: z.number().int().nonnegative(),
            cacheReadTokens: z.number().int().nonnegative().default(0),
            cacheWriteTokens: z.number().int().nonnegative().default(0),
          })
          .optional(),
        humanReview: z
          .object({
            contextualUnderstanding: z.number().int().min(0).max(4),
            explanationQuality: z.number().int().min(0).max(4),
            grounding: z.number().int().min(0).max(4),
            notes: z.string(),
          })
          .optional(),
      }),
    )
    .max(scenarios.length),
});
export type SavedRun = z.infer<typeof SavedRun>;

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const percentile = (values: number[], q: number) =>
  values.length ? [...values].sort((a, b) => a - b)[Math.ceil(q * values.length) - 1]! : null;

export function evaluate(input: unknown) {
  const run = SavedRun.parse(input);
  const records = new Map(run.records.map((record) => [record.scenarioId, record]));
  if (records.size !== run.records.length)
    throw new Error("Duplicate scenario records are not comparable");
  for (const record of run.records) {
    const scenario = scenarios.find((s) => s.id === record.scenarioId);
    if (!scenario || record.inputHash !== compile(scenario).inputHash)
      throw new Error("Unknown scenario or mismatched input hash");
  }
  const rows = scenarios.map((scenario) => {
    const { candidates } = compile(scenario);
    const record = records.get(scenario.id);
    let jsonValid = false;
    let decoded: unknown;
    try {
      decoded = JSON.parse(record?.output ?? "");
      jsonValid = true;
    } catch {
      /* Count invalid raw JSON rather than repairing it. */
    }
    const parsed = RankingInput.safeParse(decoded);
    // The production schema rejects an empty ranking; no model should be called when there are no candidates.
    const items = parsed.success && !record?.error ? parsed.data.ranking : [];
    const labels = new Map(candidates.map((c, index) => [`c${index + 1}`, c]));
    const unknown = items.filter((item) => !labels.has(item.candidate)).length;
    const duplicates = items.length - new Set(items.map((item) => item.candidate)).size;
    const rankedIds = [
      ...new Set(
        items.flatMap((item) =>
          labels.has(item.candidate) ? [labels.get(item.candidate)!.volunteer.id] : [],
        ),
      ),
    ];
    const strictValid =
      parsed.success &&
      !record?.error &&
      unknown === 0 &&
      duplicates === 0 &&
      rankedIds.length === candidates.length &&
      items.every((i) => i.reason.length <= MAX_REASON_LENGTH);
    const relevance = new Map(
      scenario.expectedTiers.flatMap((tier, index) =>
        tier.map((id) => [id, scenario.expectedTiers.length - index] as const),
      ),
    );
    const gain = (id: string) => 2 ** (relevance.get(id) ?? 0) - 1;
    const dcg = (ids: string[]) =>
      ids.slice(0, 5).reduce((sum, id, index) => sum + gain(id) / Math.log2(index + 2), 0);
    const ideal = [...relevance.keys()].sort((a, b) => gain(b) - gain(a));
    let correctPairs = 0;
    let totalPairs = 0;
    scenario.expectedTiers.forEach((tier, index) =>
      tier.forEach((better) =>
        scenario.expectedTiers
          .slice(index + 1)
          .flat()
          .forEach((worse) => {
            totalPairs++;
            const a = rankedIds.indexOf(better),
              b = rankedIds.indexOf(worse);
            if (a >= 0 && b >= 0 && a < b) correctPairs++;
          }),
      ),
    );
    const top = items[0];
    const topEntry = top ? labels.get(top.candidate) : undefined;
    const contextAnchor =
      !!top &&
      !!scenario.expectedTiers[0]?.includes(topEntry?.volunteer.id ?? "") &&
      scenario.explanationAnchors.some((word) => top.reason.toLowerCase().includes(word));
    const reasonChecks = items.map((item) => {
      const entry = labels.get(item.candidate);
      if (!entry) return false;
      const unsupportedQualification =
        /\b(certified|licensed|doctor|nurse|physician|paramedic)\b/gi;
      const claims = item.reason.match(unsupportedQualification) ?? [];
      // Known profile schedule times are factual, not phone-like contact details.
      const contactText =
        entry.components.availability === 1
          ? entry.volunteer.availability.reduce(
              (text, slot) => text.replaceAll(slot.start, "").replaceAll(slot.end, ""),
              item.reason,
            )
          : item.reason;
      return (
        item.reason.length <= MAX_REASON_LENGTH &&
        isSafeReason(contactText) &&
        claims.every((claim) =>
          entry.volunteer.experience.toLowerCase().includes(claim.toLowerCase()),
        ) &&
        !(
          entry.components.availability !== 1 &&
          /\b(available|free then|free on)\b/i.test(item.reason)
        )
      );
    });
    const usage = record?.usage;
    const rates = run.pricing;
    const costKnown =
      !!usage &&
      !!rates &&
      (!usage.cacheReadTokens || rates.cacheReadUsdPerMillion !== undefined) &&
      (!usage.cacheWriteTokens || rates.cacheWriteUsdPerMillion !== undefined);
    const estimatedUsd = costKnown
      ? (usage!.inputTokens * rates!.inputUsdPerMillion +
          usage!.outputTokens * rates!.outputUsdPerMillion +
          usage!.cacheReadTokens * (rates!.cacheReadUsdPerMillion ?? 0) +
          usage!.cacheWriteTokens * (rates!.cacheWriteUsdPerMillion ?? 0)) /
        1_000_000
      : null;
    return {
      scenarioId: scenario.id,
      title: scenario.title,
      observed: !!record,
      jsonValid,
      strictValid,
      unknownLabels: unknown,
      duplicateLabels: duplicates,
      coverage: candidates.length ? rankedIds.length / candidates.length : 1,
      top1Correct: !!rankedIds[0] && !!scenario.expectedTiers[0]?.includes(rankedIds[0]),
      ndcgAt5: ideal.length ? dcg(rankedIds) / dcg(ideal) : null,
      pairwiseAccuracy: totalPairs ? correctPairs / totalPairs : null,
      contextualAnchorProxy: contextAnchor,
      safeConciseReasonRate: reasonChecks.length ? mean(reasonChecks.map(Number)) : 0,
      latencyMs: record?.latencyMs ?? null,
      estimatedUsd,
      humanReview: record?.humanReview ?? null,
    };
  });
  const latencies = rows.flatMap((r) => (r.latencyMs === null ? [] : [r.latencyMs]));
  const costs = rows.flatMap((r) => (r.estimatedUsd === null ? [] : [r.estimatedUsd]));
  return {
    datasetVersion: DATASET_VERSION,
    provider: run.provider,
    model: run.model,
    runKind: run.runKind,
    summary: {
      totalScenarios: rows.length,
      observedScenarios: records.size,
      jsonValidityRate: mean(rows.map((r) => Number(r.jsonValid))),
      strictValidityRate: mean(rows.map((r) => Number(r.strictValid))),
      top1Accuracy: mean(rows.map((r) => Number(r.top1Correct))),
      ndcgAt5: mean(rows.flatMap((r) => (r.ndcgAt5 === null ? [] : [r.ndcgAt5]))),
      pairwiseAccuracy: mean(
        rows.flatMap((r) => (r.pairwiseAccuracy === null ? [] : [r.pairwiseAccuracy])),
      ),
      contextualAnchorProxyRate: mean(rows.map((r) => Number(r.contextualAnchorProxy))),
      safeConciseReasonRate: mean(rows.map((r) => r.safeConciseReasonRate ?? 0)),
      latencyP50Ms: percentile(latencies, 0.5),
      latencyP95Ms: percentile(latencies, 0.95),
      costCoverage: costs.length,
      estimatedTotalUsd: costs.length === rows.length ? costs.reduce((a, b) => a + b, 0) : null,
      humanReviews: rows.filter((r) => r.humanReview !== null).length,
      humanContextMean: mean(
        rows.flatMap((r) => (r.humanReview ? [r.humanReview.contextualUnderstanding] : [])),
      ),
      humanExplanationMean: mean(
        rows.flatMap((r) => (r.humanReview ? [r.humanReview.explanationQuality] : [])),
      ),
      humanGroundingMean: mean(
        rows.flatMap((r) => (r.humanReview ? [r.humanReview.grounding] : [])),
      ),
    },
    rows,
  };
}

export function compare(leftInput: unknown, rightInput: unknown) {
  const left = evaluate(leftInput),
    right = evaluate(rightInput);
  return {
    datasetVersion: DATASET_VERSION,
    completeCoverage:
      left.summary.observedScenarios === scenarios.length &&
      right.summary.observedScenarios === scenarios.length,
    runs: [left, right],
    warning:
      "No overall winner is inferred. Compare validity and grounding first, then ranking, human review, latency and cost. Mock/rules runs are not live model measurements.",
  };
}
