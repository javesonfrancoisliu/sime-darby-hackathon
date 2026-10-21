import { createHash } from "node:crypto";
import { MatchesResponse, type HelpRequest, type User } from "@sdh/contracts";
import { config } from "../../lib/config";
import { rulesReranker, selectReranker, toMatches, type Reranker } from "./reranker";
import { rankVolunteers } from "./scoring";

const CACHE_TTL_MS = 60_000;
const FALLBACK_TTL_MS = 10_000;
const MAX_CACHE_ENTRIES = 100;

interface MatchingDeps {
  reranker: () => Reranker;
  modelId: () => string | undefined;
  now: () => number;
}

// Per-process only: every call checks current eligibility before consulting the cache.
// Changes to the request, profile evidence or provider configuration change its key.
export function createMatchingService(overrides: Partial<MatchingDeps> = {}) {
  const deps: MatchingDeps = {
    reranker: selectReranker,
    modelId: () => config.matchingAiModelId,
    now: Date.now,
    ...overrides,
  };
  const cache = new Map<string, { value: MatchesResponse; expiresAt: number }>();
  const pending = new Map<string, Promise<MatchesResponse>>();

  return async (request: HelpRequest, volunteers: User[]): Promise<MatchesResponse> => {
    const candidates = rankVolunteers(request, volunteers);
    const rules = async () =>
      MatchesResponse.parse({
        rankedBy: "rules",
        matches: toMatches(await rulesReranker.rerank(request, candidates), candidates),
      });
    if (candidates.length === 0 || !deps.modelId()) return rules();
    const key = createHash("sha256")
      .update(
        JSON.stringify({
          request: [
            request.id,
            request.updatedAt,
            request.category,
            request.title,
            request.description,
            request.location,
            request.scheduledAt,
            request.durationMinutes,
          ],
          candidates: candidates.map((c) => [
            c.volunteer.id,
            c.volunteer.updatedAt,
            c.volunteer.name,
            c.volunteer.area,
            c.volunteer.experience,
            c.volunteer.skills,
            c.volunteer.availability,
            c.distanceKm,
            c.score,
          ]),
          model: deps.modelId(),
          parameter: config.anthropicApiKeyParam,
          region: process.env.AWS_REGION,
          profile: process.env.AWS_PROFILE,
          timeoutMs: config.matchingAiTimeoutMs,
        }),
      )
      .digest("hex");
    const cached = cache.get(key);
    if (cached && cached.expiresAt > deps.now()) return cached.value;
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    if (pending.size >= MAX_CACHE_ENTRIES) return rules();

    const run = async () => {
      let value: MatchesResponse;
      try {
        const result = await deps.reranker().rerank(request, candidates);
        const parsed = MatchesResponse.safeParse({
          rankedBy: result.rankedBy,
          matches: toMatches(result, candidates),
        });
        value = parsed.success && parsed.data.matches.length > 0 ? parsed.data : await rules();
      } catch {
        value = await rules();
      }
      for (const [entryKey, entry] of cache)
        if (entry.expiresAt <= deps.now()) cache.delete(entryKey);
      if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
      cache.set(key, {
        value,
        expiresAt: deps.now() + (value.rankedBy === "ai" ? CACHE_TTL_MS : FALLBACK_TTL_MS),
      });
      return value;
    };
    const work = run().finally(() => pending.delete(key));
    pending.set(key, work);
    return work;
  };
}

export const matchVolunteers = createMatchingService();
