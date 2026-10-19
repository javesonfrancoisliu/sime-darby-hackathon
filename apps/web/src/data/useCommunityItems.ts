import { useEffect, useState } from "react";

import type { EventsResponse } from "@sdh/contracts";

import type { CommunityItem, EventItem } from "../types/community";
import { DEMO_TOWNSHIP } from "../lib/township";
import { COMMUNITY_ITEMS } from "./community.mock";

type LoadState = {
  items: CommunityItem[];
  loading: boolean;
  error: string | null;
};

// Map a backend CommunityEvent to our EventItem card shape.
// The events API exists (GET /api/events) and its contract covers title, startsAt,
// durationMinutes, location, capacity, signupCount — enough for an EventCard.
// Other categories (maintenance, volunteer, township) have no API, so they stay mock.
function mapApiEvents(res: EventsResponse): EventItem[] {
  return res.events
    .filter((e) => e.status === "upcoming")
    .map((e) => ({
      id: e.id,
      townshipId: DEMO_TOWNSHIP.id,
      category: "event" as const,
      title: e.title,
      summary: e.description || "Community event",
      startsAt: e.startsAt,
      durationMinutes: e.durationMinutes,
      location: e.location.area,
      audience: "All residents",
      capacity: e.capacity,
      signupCount: e.signupCount,
      updatedAt: e.updatedAt,
      sourceLabel: "Community events API",
      // Real API data — not a simulated reading.
      isDemoData: false,
    }));
}

/**
 * Loads community items. Attempts the real events API and, on any failure
 * (API not running during the demo), falls back silently to mock events.
 * Maintenance / volunteer / township items are always mock for the prototype.
 */
export function useCommunityItems(): LoadState {
  const [state, setState] = useState<LoadState>({
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nonEvents = COMMUNITY_ITEMS.filter((i) => i.category !== "event");
      const mockEvents = COMMUNITY_ITEMS.filter(
        (i): i is EventItem => i.category === "event",
      );

      let events = mockEvents;
      try {
        const res = await fetch("/api/events", {
          headers: { accept: "application/json" },
        });
        if (res.ok) {
          const data = (await res.json()) as EventsResponse;
          const mapped = mapApiEvents(data);
          // Only use the API list if it actually returned events.
          if (mapped.length > 0) events = mapped;
        }
      } catch {
        // API unavailable — keep the mock events. Expected in offline demo mode.
      }

      if (cancelled) return;
      const items = [...events, ...nonEvents].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setState({ items, loading: false, error: null });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
