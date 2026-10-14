import type {
  CommunityEvent,
  HelpRequest,
  Opportunity,
  OpportunitiesQuery,
  User,
} from "@sdh/contracts";
import { distanceKm, roundKm } from "../../lib/geo";
import { listUpcomingEvents } from "../events/repository";
import { scoreVolunteer, type MatchTarget, type ScoredVolunteer } from "../matching/scoring";
import { DEFAULT_RADIUS_KM } from "../matching/weights";
import { listRequestsByStatus } from "../requests/repository";
import { toSummary } from "../requests/service";

interface Candidate {
  startsAt: string;
  target: MatchTarget;
  build: (scored: ScoredVolunteer) => Opportunity;
}

const fromRequest = (request: HelpRequest, viewer: User): Candidate => ({
  startsAt: request.scheduledAt,
  target: request,
  build: (scored) => ({
    kind: "request",
    request: toSummary(request, viewer.location),
    matchScore: scored.score,
    reasons: scored.reasons,
  }),
});

// Events happen at public places, so their exact location and distance are shown.
const fromEvent = (event: CommunityEvent, viewer: User): Candidate => ({
  startsAt: event.startsAt,
  target: { ...event, scheduledAt: event.startsAt },
  build: (scored) => ({
    kind: "event",
    event,
    distanceKm: roundKm(distanceKm(viewer.location, event.location)),
    matchScore: scored.score,
    reasons: scored.reasons,
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
  const [requests, events] = await Promise.all([
    listRequestsByStatus("open"),
    listUpcomingEvents(now),
  ]);
  const radiusKm = query.radiusKm ?? DEFAULT_RADIUS_KM;

  const scored = [
    ...requests.filter((request) => request.scheduledAt > now).map((r) => fromRequest(r, viewer)),
    ...events.map((event) => fromEvent(event, viewer)),
  ]
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
  return scored.map(({ candidate, scored: score }) => candidate.build(score));
}
