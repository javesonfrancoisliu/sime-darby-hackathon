import { useCallback, useEffect, useState } from "react";

import type { ContributionsResponse, OpportunitiesResponse } from "@sdh/contracts";

import type {
  Contribution,
  ImpactSummary,
  Opportunity,
  TaskCategory,
  Urgency,
} from "../types/volunteer";
import { apiFetch, errorMessage } from "../lib/api";
import { useSession } from "./SessionContext";
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
        category: r.category as TaskCategory,
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
      category: e.category as TaskCategory,
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
  /** Set when live mode could not load; the UI shows it instead of falling back to mock. */
  error: string | null;
  /** True when the data came from the API (a demo user is signed in). */
  live: boolean;
  reload: () => void;
};

/**
 * Signed out: labelled demo data, so the prototype still works offline.
 * Signed in (demo user chosen on Profile): the live opportunities and
 * contributions APIs, with errors shown rather than hidden behind mock data.
 */
export function useVolunteerData(): VolunteerData {
  const { userId } = useSession();
  const [version, setVersion] = useState(0);
  // `forUserId` marks whose data is loaded, so switching user shows loading
  // while a reload after accept/complete keeps the current list on screen.
  const [liveState, setLiveState] = useState<{
    forUserId: string | null;
    opportunities: Opportunity[];
    impact: ImpactSummary;
    error: string | null;
  }>({ forUserId: null, opportunities: [], impact: EMPTY_IMPACT, error: null });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.all([
      apiFetch<OpportunitiesResponse>("/api/opportunities", { userId }),
      apiFetch<ContributionsResponse>("/api/contributions/mine", { userId }),
    ])
      .then(([opportunities, contributions]) => {
        if (cancelled) return;
        setLiveState({
          forUserId: userId,
          opportunities: mapOpportunities(opportunities),
          impact: mapContributions(contributions),
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLiveState({
          forUserId: userId,
          opportunities: [],
          impact: EMPTY_IMPACT,
          error: errorMessage(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  if (!userId) {
    return {
      opportunities: MOCK_OPPORTUNITIES,
      impact: MOCK_IMPACT,
      loading: false,
      error: null,
      live: false,
      reload,
    };
  }
  const loaded = liveState.forUserId === userId;
  return {
    opportunities: loaded ? liveState.opportunities : [],
    impact: loaded ? liveState.impact : EMPTY_IMPACT,
    loading: !loaded,
    error: loaded ? liveState.error : null,
    live: true,
    reload,
  };
}
