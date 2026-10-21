import type { Match } from "@sdh/contracts";
import { config } from "../../lib/config";
import { createClaudeReranker } from "./claudeReranker";
import { ruleReason, type MatchTarget, type ScoredVolunteer } from "./scoring";
import { RESULT_SIZE } from "./weights";

export type Candidate = ScoredVolunteer;

export interface RerankResult {
  rankedBy: "ai" | "rules";
  items: { volunteerId: string; reason: string }[];
}

export interface Reranker {
  rerank(target: MatchTarget, candidates: Candidate[]): Promise<RerankResult>;
}

export const rulesReranker: Reranker = {
  async rerank(_target, candidates) {
    return {
      rankedBy: "rules",
      items: candidates.map((entry) => ({
        volunteerId: entry.volunteer.id,
        reason: ruleReason(entry),
      })),
    };
  },
};

export function selectReranker(): Reranker {
  return config.matchingAiModelId ? createClaudeReranker() : rulesReranker;
}

export function toMatches(result: RerankResult, candidates: Candidate[]): Match[] {
  const byId = new Map(candidates.map((entry) => [entry.volunteer.id, entry]));
  const matches: Match[] = [];
  const seen = new Set<string>();
  for (const item of result.items) {
    const entry = byId.get(item.volunteerId);
    if (!entry || seen.has(item.volunteerId)) continue;
    seen.add(item.volunteerId);
    matches.push({
      volunteerId: entry.volunteer.id,
      name: entry.volunteer.name,
      area: entry.volunteer.area,
      distanceKm: entry.distanceKm,
      score: entry.score,
      reason: item.reason,
    });
    if (matches.length === RESULT_SIZE) break;
  }
  return matches;
}
