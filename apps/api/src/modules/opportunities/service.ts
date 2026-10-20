import type { HelpRequest, Opportunity, OpportunitiesQuery, User } from "@sdh/contracts";
import { scoreVolunteer, type MatchTarget, type ScoredVolunteer } from "../matching/scoring";
import { DEFAULT_RADIUS_KM } from "../matching/weights";
import { matchOpportunitiesForVolunteer } from "../matching/requestMatching";
import { listRequestsByStatus } from "../requests/repository";
import { toSummary } from "../requests/service";

interface Candidate {
  startsAt: string;
  target: MatchTarget;
  build: (scored: ScoredVolunteer) => Opportunity;
}

function opportunityReasons(scored: ScoredVolunteer): string[] {
  return [
    ...scored.reasons,
    ...(scored.components.availability === 1
      ? []
      : [
          scored.volunteer.availability.length
            ? "Your saved schedule does not cover this time"
            : "Your availability is not provided",
        ]),
  ];
}

const fromRequest = (request: HelpRequest, viewer: User): Candidate => ({
  startsAt: request.scheduledAt,
  target: request,
  build: (scored) => ({
    kind: "request",
    request: toSummary(request, viewer.location),
    matchScore: scored.score,
    reasons: opportunityReasons(scored),
    matchSource: "rules",
    explanationSource: "rules",
  }),
});

function inWindow(startsAt: string, query: OpportunitiesQuery): boolean {
  const time = Date.parse(startsAt);
  if (query.from && time < Date.parse(query.from)) return false;
  if (query.to && time > Date.parse(query.to)) return false;
  return true;
}

export async function listOpportunities(
  viewer: User,
  query: OpportunitiesQuery,
): Promise<Opportunity[]> {
  const now = new Date().toISOString();
  const requests = await listRequestsByStatus("open");
  const radiusKm = query.radiusKm ?? DEFAULT_RADIUS_KM;

  const scored = requests
    .filter((request) => request.scheduledAt > now)
    .map((request) => fromRequest(request, viewer))
    .filter((candidate) => !query.category || candidate.target.category === query.category)
    .filter((candidate) => inWindow(candidate.startsAt, query))
    .map((candidate) => ({ candidate, scored: scoreVolunteer(viewer, candidate.target, radiusKm) }))
    .filter(
      (entry): entry is { candidate: Candidate; scored: ScoredVolunteer } =>
        entry.scored !== null &&
        (!query.fitsMySchedule || entry.scored.components.availability === 1),
    );

  scored.sort(
    (a, b) =>
      b.scored.score - a.scored.score || a.candidate.startsAt.localeCompare(b.candidate.startsAt),
  );
  const items = scored.map(({ candidate, scored: score }) => candidate.build(score));
  const key = (item: Opportunity) =>
    item.kind === "request" ? `request:${item.request.id}` : `event:${item.event.id}`;
  const entries = scored.map(({ candidate, scored: score }, index) => {
    const item = items[index]!;
    return { id: key(item), kind: item.kind, target: candidate.target, scored: score };
  });
  const recommendations = await matchOpportunitiesForVolunteer(viewer, entries);
  const byId = new Map(items.map((item) => [key(item), item]));
  return recommendations.map((recommendation, index) => {
    const item = byId.get(recommendation.id)!;
    return {
      ...item,
      reasons: recommendation.explanationSource === "ai" ? [recommendation.reason] : item.reasons,
      matchSource: recommendation.rankedBy,
      explanationSource: recommendation.explanationSource,
      matchRank: index + 1,
    };
  });
}
