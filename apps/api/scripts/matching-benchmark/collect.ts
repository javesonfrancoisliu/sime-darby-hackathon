import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { HelpRequest } from "@sdh/contracts";
import { performance } from "node:perf_hooks";
import { createClaudeReranker, type SendMessage } from "../../src/modules/matching/claudeReranker";
import { createMatchingService } from "../../src/modules/matching/service";
import { DATASET_VERSION, scenarios } from "./dataset";
import { compile, SavedRun, evaluate } from "./evaluate";
import { RANKING_TOOL_NAME } from "../../src/modules/matching/prompt";

export const MODEL = "claude-haiku-5-5";
export function createAttemptGuard(limit = 15) {
  const attempted = new Set<string>();
  return {
    get count() {
      return attempted.size;
    },
    claim(scenarioId: string) {
      if (attempted.has(scenarioId) || attempted.size >= limit)
        throw new Error("Inference attempt limit reached");
      attempted.add(scenarioId);
    },
  };
}

// Dependency injection records the production reranker without replacing its prompt or validation.
export async function collect(
  sendFor: (scenarioId: string) => SendMessage,
  checkpoint: (scenarioId: string, data: unknown) => void,
  timeoutMs = 9000,
) {
  const records: SavedRun["records"] = [];
  const hybridRecords: SavedRun["records"] = [];
  const outcomes: { scenarioId: string; rankedBy: string; fallback: boolean; matches: unknown }[] =
    [];
  for (const scenario of scenarios) {
    const prepared = compile(scenario);
    let message: Message | undefined;
    let errorCode: string | undefined;
    let latencyMs = 0;
    let started = 0;
    const transport = sendFor(scenario.id);
    const send: SendMessage = async (request, signal) => {
      const { model, ...canonical } = request;
      if (model !== MODEL || JSON.stringify(canonical) !== JSON.stringify(prepared.request))
        throw new Error("Production input differs from benchmark manifest");
      started = performance.now();
      try {
        message = await transport(request, signal);
        latencyMs = performance.now() - started;
        checkpoint(`${scenario.id}-raw`, {
          model: message.model,
          content: message.content,
          usage: message.usage,
          stopReason: message.stop_reason,
        });
        return message;
      } catch (error) {
        errorCode = error instanceof Error ? error.name : "UnknownError";
        throw error;
      } finally {
        if (!latencyMs) latencyMs = performance.now() - started;
      }
    };
    const service = createMatchingService({
      modelId: () => MODEL,
      reranker: () => createClaudeReranker({ modelId: MODEL, timeoutMs, send }),
    });
    const request = HelpRequest.parse({
      ...scenario.target,
      id: `11111111-1111-4111-8111-${scenario.id.slice(-2).padStart(12, "0")}`,
      elderId: "22222222-2222-4222-8222-222222222222",
      elderName: "Fictional benchmark resident",
      location: { ...scenario.target.location, area: "Fictional precinct" },
      status: "open",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    });
    const result = await service(request, scenario.volunteers);
    if (!latencyMs && started) latencyMs = performance.now() - started;
    const tool = message?.content.find(
      (block) => block.type === "tool_use" && block.name === RANKING_TOOL_NAME,
    );
    const output =
      tool?.type === "tool_use"
        ? JSON.stringify(tool.input)
        : (message?.content
            .flatMap((block) => (block.type === "text" ? [block.text] : []))
            .join("") ?? "");
    const usage = message
      ? {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
        }
      : undefined;
    const record = {
      scenarioId: scenario.id,
      inputHash: prepared.inputHash,
      output,
      latencyMs,
      ...(usage ? { usage } : {}),
      ...(!message ? { error: errorCode ?? "TimeoutOrNoResponse" } : {}),
    };
    records.push(record);
    const labels = new Map(
      prepared.candidates.map((candidate, index) => [candidate.volunteer.id, `c${index + 1}`]),
    );
    hybridRecords.push({
      ...record,
      error: undefined,
      output: JSON.stringify({
        ranking: result.matches.map((match) => ({
          candidate: labels.get(match.volunteerId),
          reason: match.reason,
        })),
      }),
    });
    const outcome = {
      scenarioId: scenario.id,
      rankedBy: result.rankedBy,
      fallback: result.rankedBy === "rules",
      matches: result.matches,
    };
    outcomes.push(outcome);
    checkpoint(scenario.id, { record, outcome });
  }
  const run = SavedRun.parse({
    datasetVersion: DATASET_VERSION,
    provider: "anthropic",
    model: MODEL,
    runKind: "live",
    pricing: {
      asOf: "2026-10-20",
      source: "https://platform.claude.com/docs/en/about-claude/pricing",
      inputUsdPerMillion: 0.1,
      outputUsdPerMillion: 0.5,
      cacheReadUsdPerMillion: 0.01,
      cacheWriteUsdPerMillion: 0.125,
    },
    records,
  });
  const hybridRun = SavedRun.parse({ ...run, records: hybridRecords });
  return { run, rawReport: evaluate(run), hybridReport: evaluate(hybridRun), outcomes };
}
