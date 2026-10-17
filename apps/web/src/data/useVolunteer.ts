import { useEffect, useState } from "react";

import type {
  ContributionsResponse,
  OpportunitiesResponse,
} from "@sdh/contracts";

import type {
  Contribution,
  ImpactSummary,
  Opportunity,
  TaskCategory,
} from "../types/volunteer";
import { MOCK_IMPACT, MOCK_OPPORTUNITIES } from "./volunteer.mock";

// The opportunities/contributions APIs need a signed-in volunteer (the
// X-Demo-User header). For the prototype we try the API and fall back to mock
// data on any failure — same resilient pattern as the events feed. No backend
// changes are made here.
const DEMO_USER_HEADER = "X-Demo-User";

function demoUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("tc.demoUserId");
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
        urgency: "medium" as const,
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
      urgency: "low" as const,
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
};

export function useVolunteerData(): VolunteerData {
  const [state, setState] = useState<VolunteerData>({
    opportunities: [],
    impact: MOCK_IMPACT,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let opportunities = MOCK_OPPORTUNITIES;
      let impact = MOCK_IMPACT;

      const userId = demoUserId();
      if (userId) {
        const headers = { accept: "application/json", [DEMO_USER_HEADER]: userId };
        try {
          const [oppRes, conRes] = await Promise.all([
            fetch("/api/opportunities", { headers }),
            fetch("/api/contributions/mine", { headers }),
          ]);
          if (oppRes.ok) {
            const mapped = mapOpportunities((await oppRes.json()) as OpportunitiesResponse);
            if (mapped.length > 0) opportunities = mapped;
          }
          if (conRes.ok) {
            impact = mapContributions((await conRes.json()) as ContributionsResponse);
          }
        } catch {
          // API unavailable — keep mock data. Expected in offline demo mode.
        }
      }

      if (cancelled) return;
      setState({ opportunities, impact, loading: false });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
