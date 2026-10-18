import { useMemo } from "react";

import type { EventsResponse } from "@sdh/contracts";

import type { CommunityItem, EventItem } from "../types/community";
import { apiFetch, errorMessage, useSession } from "@sdh/api-client";
import { useLoader } from "../lib/useLoader";
import { DEMO_TOWNSHIP } from "../lib/township";
import { COMMUNITY_ITEMS } from "./community.mock";

export type CommunityItemsState = {
  items: CommunityItem[];
  loading: boolean;
  // Set when signed in and the events API could not be reached; no sample events replace them.
  error: string | null;
  // True when signed out and the sample events are shown because the API had none.
  usingSampleData: boolean;
  reload: () => Promise<void>;
};

type Result = { events: EventItem[]; error: string | null; usingSampleData: boolean };

// Map a backend CommunityEvent to our EventItem card shape.
// The events API exists (GET /api/events) and its contract covers title, startsAt,
// durationMinutes, location, capacity, signupCount - enough for an EventCard.
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
      joined: e.joined,
      updatedAt: e.updatedAt,
      sourceLabel: "Community events API",
      // Real API data - not a simulated reading.
      isDemoData: false,
    }));
}

const NON_EVENT_ITEMS = COMMUNITY_ITEMS.filter((i) => i.category !== "event");
const MOCK_EVENTS = COMMUNITY_ITEMS.filter((i): i is EventItem => i.category === "event");

async function loadEvents(userId: string | null): Promise<Result> {
  try {
    const events = mapApiEvents(await apiFetch<EventsResponse>("/api/events", { userId }));
    // Signed out, an empty list falls back to labelled sample events so the demo is not blank.
    if (!userId && events.length === 0) {
      return { events: MOCK_EVENTS, error: null, usingSampleData: true };
    }
    return { events, error: null, usingSampleData: false };
  } catch (err) {
    if (userId) return { events: [], error: errorMessage(err), usingSampleData: false };
    return { events: MOCK_EVENTS, error: null, usingSampleData: true };
  }
}

// Loads community items. Events come from the events API. Signed out, sample
// events stand in when the API is empty or unreachable and the page says so.
// Signed in, an unreachable API is reported rather than hidden behind samples.
// Maintenance, volunteer and township items are always sample content.
export function useCommunityItems(): CommunityItemsState {
  const { userId } = useSession();
  const { loaded, reload } = useLoader(userId, loadEvents);
  const ready = loaded !== null && loaded.scope === userId ? loaded.value : null;

  const items = useMemo<CommunityItem[]>(
    () =>
      [...(ready?.events ?? []), ...NON_EVENT_ITEMS].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [ready],
  );

  return {
    items,
    loading: ready === null,
    error: ready?.error ?? null,
    usingSampleData: ready?.usingSampleData ?? false,
    reload,
  };
}
