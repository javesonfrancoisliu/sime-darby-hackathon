import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { HelpRequest } from "@sdh/contracts";
import { createMatchingService } from "../../src/modules/matching/service";
import { createClaudeReranker } from "../../src/modules/matching/claudeReranker";
import { prepareExplanation } from "../../src/modules/matching/explanations";
import { scenarios } from "./dataset";
import { compile, evaluate, SavedRun } from "./evaluate";

const source = new URL("./results/haiku-2026-10-20/", import.meta.url);
export async function replaySavedResponses() {
  const original = SavedRun.parse(
    JSON.parse(readFileSync(new URL("raw-run.json", source), "utf8")),
  );
  // Validate historical hashes against captured requests, not today's revised prompt.
  const inputs = JSON.parse(readFileSync(new URL("inputs.json", source), "utf8")) as {
    cases: { scenarioId: string; inputHash: string; request: { messages: unknown } }[];
  };
  for (const record of original.records) {
    const captured = inputs.cases.find((item) => item.scenarioId === record.scenarioId);
    const scenario = scenarios.find((item) => item.id === record.scenarioId);
    if (!captured || !scenario) throw new Error("Missing historical input");
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          datasetVersion: original.datasetVersion,
          scenarioId: record.scenarioId,
          request: captured.request,
        }),
      )
      .digest("hex");
    if (
      hash !== record.inputHash ||
      hash !== captured.inputHash ||
      JSON.stringify(captured.request.messages) !==
        JSON.stringify(compile(scenario).request.messages)
    )
      throw new Error("Historical input hash or dataset changed");
  }
  const previous: { scenarioId: string; matches: { volunteerId: string; score: number }[] }[] =
    JSON.parse(readFileSync(new URL("outcomes.json", source), "utf8"));
  let sends = 0;
  const results = [];
  const records = [];
  for (const scenario of scenarios) {
    const prepared = compile(scenario);
    const saved = JSON.parse(readFileSync(new URL(`${scenario.id}-raw.json`, source), "utf8"));
    const service = createMatchingService({
      modelId: () => "offline-saved-Claude",
      reranker: () =>
        createClaudeReranker({
          modelId: "offline-saved-Claude",
          send: async () => {
            sends++;
            return {
              model: saved.model,
              content: saved.content,
              usage: saved.usage,
              stop_reason: saved.stopReason,
            } as Message;
          },
        }),
    });
    const request = HelpRequest.parse({
      ...scenario.target,
      id: `11111111-1111-4111-8111-${scenario.id.slice(-2).padStart(12, "0")}`,
      elderId: "22222222-2222-4222-8222-222222222222",
      elderName: "Fictional resident",
      location: { ...scenario.target.location, area: "Fictional precinct" },
      status: "open",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    });
    const result = await service(request, scenario.volunteers);
    const rankingBefore = previous
      .find((r) => r.scenarioId === scenario.id)!
      .matches.map((m) => [m.volunteerId, m.score]);
    const rankingAfter = result.matches.map((m) => [m.volunteerId, m.score]);
    if (JSON.stringify(rankingBefore) !== JSON.stringify(rankingAfter))
      throw new Error(`Ranking or score changed: ${scenario.id}`);
    const labels = new Map(prepared.candidates.map((c, i) => [c.volunteer.id, `c${i + 1}`]));
    const rawItems: { candidate: string; reason: string }[] = JSON.parse(
      original.records.find((r) => r.scenarioId === scenario.id)!.output,
    ).ranking;
    const treatments = rawItems.map((item) => ({
      candidate: item.candidate,
      original: item.reason,
      ...prepareExplanation(item.reason, prepared.candidates[Number(item.candidate.slice(1)) - 1]!),
    }));
    results.push({
      scenarioId: scenario.id,
      rankedBy: result.rankedBy,
      matches: result.matches,
      treatments,
    });
    records.push({
      scenarioId: scenario.id,
      inputHash: prepared.inputHash,
      latencyMs: 0,
      output: JSON.stringify({
        ranking: result.matches.map((m) => ({
          candidate: labels.get(m.volunteerId),
          reason: m.reason,
        })),
      }),
    });
  }
  const report = evaluate({
    datasetVersion: original.datasetVersion,
    provider: "offline-replay",
    model: "saved-claude-haiku-5-5",
    runKind: "mock",
    records,
  });
  return {
    mode: "offline-saved-response-replay",
    liveRequests: 0,
    newTokenUsage: 0,
    newInferenceCostUsd: 0,
    sourceResponses: sends,
    rankingsAndScoresUnchanged: true,
    metrics: { ...report.summary, latencyP50Ms: null, latencyP95Ms: null },
    results,
  };
}
