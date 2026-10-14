import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
  type ConverseCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { MAX_REASON_LENGTH } from "@sdh/contracts";
import { config } from "../../lib/config";
import { logger } from "../../lib/logger";
import { buildConverseRequest, candidateLabel, RANKING_TOOL_NAME, RankingInput } from "./prompt";
import type { Reranker, RerankResult } from "./reranker";
import { ruleReason, type MatchTarget, type ScoredVolunteer } from "./scoring";

export type SendConverse = (
  input: ConverseCommandInput,
  signal: AbortSignal,
) => Promise<ConverseCommandOutput>;

export interface BedrockDeps {
  send: SendConverse;
  modelId: string | undefined;
  timeoutMs: number;
}

let client: BedrockRuntimeClient | undefined;

// Created on first use so importing the module never needs AWS config.
const defaultSend: SendConverse = (input, signal) => {
  client ??= new BedrockRuntimeClient({});
  return client.send(new ConverseCommand(input), { abortSignal: signal });
};

const defaultDeps = (): BedrockDeps => ({
  send: defaultSend,
  modelId: config.matchingAiModelId,
  timeoutMs: config.matchingAiTimeoutMs,
});

const rulesResult = (candidates: ScoredVolunteer[]): RerankResult => ({
  rankedBy: "rules",
  items: candidates.map((entry) => ({
    volunteerId: entry.volunteer.id,
    reason: ruleReason(entry),
  })),
});

const truncate = (text: string): string =>
  text.length > MAX_REASON_LENGTH ? `${text.slice(0, MAX_REASON_LENGTH - 3).trimEnd()}...` : text;

function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Bedrock re-rank timed out"));
    }, timeoutMs);
  });
  return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

function extractRanking(output: ConverseCommandOutput): RankingInput {
  const blocks = output.output?.message?.content ?? [];
  const toolUse = blocks.find((block) => block.toolUse?.name === RANKING_TOOL_NAME)?.toolUse;
  return RankingInput.parse(toolUse?.input);
}

// Model output is untrusted: only known labels survive, and missing candidates are appended.
function mergeRanking(ranking: RankingInput, candidates: ScoredVolunteer[]): RerankResult {
  const byLabel = new Map(candidates.map((entry, index) => [candidateLabel(index), entry]));
  const seen = new Set<string>();
  const items: RerankResult["items"] = [];

  for (const { candidate, reason } of ranking.ranking) {
    const entry = byLabel.get(candidate);
    if (!entry || seen.has(candidate)) continue;
    seen.add(candidate);
    items.push({
      volunteerId: entry.volunteer.id,
      reason: truncate(isSafeReason(reason) ? reason.trim() : ruleReason(entry)),
    });
  }
  candidates.forEach((entry, index) => {
    if (seen.has(candidateLabel(index))) return;
    items.push({ volunteerId: entry.volunteer.id, reason: truncate(ruleReason(entry)) });
  });
  return { rankedBy: "ai", items };
}

// Model reasons are shown to elders; anything that looks like a link, email or phone number
// could be injected via user-written text, so it is replaced with the rule-based reason.
const UNSAFE_REASON = /(https?:|www\.|@|\d[\d\s-]{5,}\d)/i;
export const isSafeReason = (reason: string): boolean =>
  reason.trim().length > 0 && !UNSAFE_REASON.test(reason);

export function createBedrockReranker(deps: Partial<BedrockDeps> = {}): Reranker {
  return {
    async rerank(target: MatchTarget, candidates: ScoredVolunteer[]): Promise<RerankResult> {
      const { send, modelId, timeoutMs } = { ...defaultDeps(), ...deps };
      if (!modelId || candidates.length === 0) return rulesResult(candidates);
      try {
        const request = buildConverseRequest(modelId, target, candidates);
        const output = await withTimeout((signal) => send(request, signal), timeoutMs);
        return mergeRanking(extractRanking(output), candidates);
      } catch (error) {
        // Log only the failure kind; never candidate or request data.
        logger.warn("Bedrock re-rank failed, using rules", {
          error: error instanceof Error ? error.name : "unknown",
        });
        return rulesResult(candidates);
      }
    },
  };
}
