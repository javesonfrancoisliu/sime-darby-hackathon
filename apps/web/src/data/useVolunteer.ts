import type { ContributionsResponse, OpportunitiesResponse } from "@sdh/contracts";

import type {
  Contribution,
  ImpactSummary,
  Opportunity,
  Urgency,
} from "../types/volunteer";
import { ApiError, apiFetch, errorMessage, useSession } from "@sdh/api-client";
import { useLoader } from "../lib/useLoader";
import { MOCK_IMPACT, MOCK_OPPORTUNITIES } from "./volunteer.mock";

const EMPTY_IMPACT: ImpactSummary = {
  totalMinutes: 0,
  completedCount: 0,
  peopleHelped: 0,
  items: [],
  isDemoData: false,
};

// The API has no urgency field, so derive it from how soon the help is needed.
const HOUR_MS = 3_600_000;
function urgencyFor(startsAt: string): Urgency {
  const hoursAway = (Date.parse(startsAt) - Date.now()) / HOUR_MS;
  if (hoursAway <= 24) return "high";
  if (hoursAway <= 72) return "medium";
  return "low";
}

function mapOpportunities(res: OpportunitiesResponse): Opportunity[] {
  return res.items.map((item) => {
    if (item.kind === "request") {
      const r = item.request;
      return {
        id: r.id,
        kind: "request" as const,
        title: r.title,
        summary: r.description || "Help request",
        category: r.category,
        // API summaries omit precise coords for privacy; use the baked distance.
        distanceKm: r.distanceKm,
        area: r.area,
        scheduledAt: r.scheduledAt,
        durationMinutes: r.durationMinutes,
        urgency: urgencyFor(r.scheduledAt),
        matchScore: item.matchScore,
        reasons: item.reasons,
        fitsMySchedule: false,
        isDemoData: false,
        sourceLabel: "Opportunities API",
      };
    }
    const e = item.event;
    return {
      id: e.id,
      kind: "event" as const,
      title: e.title,
      summary: e.description || "Community event",
      category: e.category,
      coords: { lat: e.location.lat, lng: e.location.lng },
      distanceKm: item.distanceKm,
      area: e.location.area,
      scheduledAt: e.startsAt,
      durationMinutes: e.durationMinutes,
      urgency: urgencyFor(e.startsAt),
      matchScore: item.matchScore,
      reasons: item.reasons,
      fitsMySchedule: false,
      isDemoData: false,
      sourceLabel: "Opportunities API",
    };
  });
}

function mapContributions(res: ContributionsResponse): ImpactSummary {
  const items: Contribution[] = res.items.map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source,
    minutes: c.minutes,
    completedAt: c.completedAt,
  }));
  return {
    totalMinutes: res.totalMinutes,
    completedCount: res.completedCount,
    // The API reports completed tasks; treat each as one neighbour helped.
    peopleHelped: res.completedCount,
    items,
    isDemoData: false,
  };
}

export type VolunteerData = {
  opportunities: Opportunity[];
  impact: ImpactSummary;
  loading: boolean;
  // Set when live mode could not load; the UI shows it instead of falling back to mock.
  error: string | null;
  // The API refused the feed because the volunteer is not verified yet.
  notVerified: boolean;
  // Set when only the volunteer-hours summary failed; the feed still works.
  impactError: string | null;
  // True when the data came from the API (a demo user is signed in).
  live: boolean;
  reload: () => Promise<void>;
};

type LiveResult = {
  opportunities: Opportunity[];
  impact: ImpactSummary;
  error: string | null;
  notVerified: boolean;
  impactError: string | null;
};

// One failing call must not blank the other, so both are settled separately.
async function loadLive(userId: string | null): Promise<LiveResult> {
  const [feed, hours] = await Promise.allSettled([
    apiFetch<OpportunitiesResponse>("/api/opportunities", { userId }),
    apiFetch<ContributionsResponse>("/api/contributions/mine", { userId }),
  ]);
  const notVerified =
    feed.status === "rejected" &&
    feed.reason instanceof ApiError &&
    feed.reason.code === "FORBIDDEN";
  return {
    opportunities: feed.status === "fulfilled" ? mapOpportunities(feed.value) : [],
    impact: hours.status === "fulfilled" ? mapContributions(hours.value) : EMPTY_IMPACT,
    error: feed.status === "rejected" && !notVerified ? errorMessage(feed.reason) : null,
    notVerified,
    impactError: hours.status === "rejected" ? errorMessage(hours.reason) : null,
  };
}

// Signed out: labelled demo data, so the prototype still works offline.
// Signed in (demo user chosen on Profile): the live opportunities and
// contributions APIs, with errors shown rather than hidden behind mock data.
export function useVolunteerData(): VolunteerData {
  const { userId } = useSession();
  const { loaded, reload } = useLoader(userId, loadLive, userId !== null);

  if (!userId) {
    return {
      opportunities: MOCK_OPPORTUNITIES,
      impact: MOCK_IMPACT,
      loading: false,
      error: null,
      notVerified: false,
      impactError: null,
      live: false,
      reload,
    };
  }
  // A reload after accept or complete keeps the current list on screen; only a
  // different user shows loading.
  const ready = loaded !== null && loaded.scope === userId ? loaded.value : null;
  return {
    opportunities: ready?.opportunities ?? [],
    impact: ready?.impact ?? EMPTY_IMPACT,
    loading: ready === null,
    error: ready?.error ?? null,
    notVerified: ready?.notVerified ?? false,
    impactError: ready?.impactError ?? null,
    live: true,
    reload,
  };
}
