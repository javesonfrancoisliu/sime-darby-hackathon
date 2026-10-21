import type { ContributionsResponse, OpportunitiesResponse } from "@sdh/contracts";

import type { Contribution, ImpactSummary, Opportunity } from "../types/volunteer";
import { ApiError, apiFetch, errorMessage, useSession } from "@sdh/api-client";
import { LIVE_REFRESH_MS, useLoader } from "../lib/useLoader";

const EMPTY_IMPACT: ImpactSummary = {
  totalMinutes: 0,
  completedCount: 0,
  peopleHelped: 0,
  items: [],
};

function mapOpportunities(res: OpportunitiesResponse): Opportunity[] {
  return res.items
    .filter((item) => item.kind === "request")
    .map((item) => {
      const r = item.request;
      return {
        id: r.id,
        kind: "request" as const,
        title: r.title,
        summary: r.description || "Help request",
        category: r.category,
        // API summaries carry an approximate distance only, for privacy.
        distanceKm: r.distanceKm,
        area: r.area,
        scheduledAt: r.scheduledAt,
        durationMinutes: r.durationMinutes,
        matchScore: item.matchScore,
        matchSource: item.matchSource ?? "rules",
        explanationSource: item.explanationSource,
        matchRank: item.matchRank,
        reasons: item.reasons,
        fitsMySchedule: false,
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
  };
}

export type VolunteerData = {
  opportunities: Opportunity[];
  impact: ImpactSummary;
  loading: boolean;
  // Set when the feed could not load.
  error: string | null;
  // The API refused the feed because the volunteer is not verified yet.
  notVerified: boolean;
  // Set when only the volunteer-hours summary failed; the feed still works.
  impactError: string | null;
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

// A failed background refresh must not replace a list the volunteer is reading.
const feedFailed = (result: LiveResult): boolean => result.error !== null;

// The volunteer's opportunities and hours. Idle until someone is signed in; errors are shown
// rather than hidden.
export function useVolunteerData(): VolunteerData {
  const { userId } = useSession();
  const { loaded, reload } = useLoader(
    userId,
    loadLive,
    userId !== null,
    LIVE_REFRESH_MS,
    feedFailed,
  );
  // A reload after accept or complete keeps the current list on screen; only a
  // different user shows loading.
  const ready = loaded !== null && loaded.scope === userId ? loaded.value : null;
  return {
    opportunities: ready?.opportunities ?? [],
    impact: ready?.impact ?? EMPTY_IMPACT,
    loading: userId !== null && ready === null,
    error: ready?.error ?? null,
    notVerified: ready?.notVerified ?? false,
    impactError: ready?.impactError ?? null,
    reload,
  };
}
