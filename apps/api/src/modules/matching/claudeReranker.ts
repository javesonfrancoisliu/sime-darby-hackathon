import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages";
import { MAX_REASON_LENGTH } from "@sdh/contracts";
import { getAnthropicApiKey } from "../../lib/anthropicKey";
import { config } from "../../lib/config";
import { logger } from "../../lib/logger";
import { buildMessageRequest, candidateLabel, RANKING_TOOL_NAME, RankingInput } from "./prompt";
import type { Reranker, RerankResult } from "./reranker";
import { ruleReason, type MatchTarget, type ScoredVolunteer } from "./scoring";

export type SendMessage = (
  request: MessageCreateParamsNonStreaming,
  signal: AbortSignal,
) => Promise<Message>;

export interface ClaudeDeps {
  send: SendMessage;
  modelId: string | undefined;
  timeoutMs: number;
}

let client: { apiKey: string; instance: Anthropic } | undefined;

// The key is loaded inside the call so a slow SSM read counts against the re-rank timeout.
// The client is rebuilt only when the key rotates; retries are off because the timeout is tight.
const defaultSend: SendMessage = async (request, signal) => {
  const apiKey = await getAnthropicApiKey();
  if (client?.apiKey !== apiKey) {
    client = { apiKey, instance: new Anthropic({ apiKey, maxRetries: 0 }) };
  }
  return client.instance.messages.create(request, { signal });
};

const defaultDeps = (): ClaudeDeps => ({
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
      reject(new Error("Claude re-rank timed out"));
    }, timeoutMs);
  });
  return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

function extractRanking(message: Message): RankingInput {
  const toolUse = message.content.find(
    (block) => block.type === "tool_use" && block.name === RANKING_TOOL_NAME,
  );
  return RankingInput.parse(toolUse?.type === "tool_use" ? toolUse.input : undefined);
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
const LINK_OR_EMAIL = /(https?:|www\.|@|[a-z0-9-]+\.[a-z]{2,})/i;
const MAX_DIGITS = 6;
export const isSafeReason = (reason: string): boolean =>
  reason.trim().length > 0 &&
  !LINK_OR_EMAIL.test(reason) &&
  reason.replace(/\D/g, "").length <= MAX_DIGITS;

export function createClaudeReranker(deps: Partial<ClaudeDeps> = {}): Reranker {
  return {
    async rerank(target: MatchTarget, candidates: ScoredVolunteer[]): Promise<RerankResult> {
      const { send, modelId, timeoutMs } = { ...defaultDeps(), ...deps };
      if (!modelId || candidates.length === 0) return rulesResult(candidates);
      try {
        const request = buildMessageRequest(modelId, target, candidates);
        const message = await withTimeout((signal) => send(request, signal), timeoutMs);
        return mergeRanking(extractRanking(message), candidates);
      } catch (error) {
        // Log only the failure kind; never candidate, request or key data.
        logger.warn("Claude re-rank failed, using rules", {
          error: error instanceof Error ? error.name : "unknown",
        });
        return rulesResult(candidates);
      }
    },
  };
}
