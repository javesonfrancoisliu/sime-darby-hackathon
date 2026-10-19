import { useMemo } from "react";

import type { CommunityEvent, EventsResponse, Notice, Paged } from "@sdh/contracts";

import { apiFetch, errorMessage, useSession } from "@sdh/api-client";
import { eventToItem, noticeToItem, sortFeed } from "../lib/community";
import { useLoader } from "../lib/useLoader";
import type { CommunityItem } from "../types/community";

export type CommunityItemsState = {
  items: CommunityItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type Result = { items: CommunityItem[]; error: string | null };

// Notices come in pages; a township feed stays small, so a few pages are plenty.
const MAX_NOTICE_PAGES = 5;

async function loadNotices(userId: string | null): Promise<Notice[]> {
  const notices: Notice[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_NOTICE_PAGES; page += 1) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiFetch<Paged<Notice>>(`/api/notices${query}`, { userId });
    notices.push(...res.items);
    cursor = res.nextCursor;
    if (!cursor) break;
  }
  return notices;
}

function upcoming(events: CommunityEvent[]): CommunityEvent[] {
  return events.filter((event) => event.status === "upcoming");
}

// One feed of notices (maintenance and updates), volunteer drives and events. A failing source is
// reported but never hides the other.
async function load(userId: string | null): Promise<Result> {
  const [notices, events] = await Promise.allSettled([
    loadNotices(userId),
    apiFetch<EventsResponse>("/api/events", { userId }),
  ]);
  const items = [
    ...(notices.status === "fulfilled" ? notices.value.map(noticeToItem) : []),
    ...(events.status === "fulfilled" ? upcoming(events.value.events).map(eventToItem) : []),
  ];
  const failed = [notices, events].find((r) => r.status === "rejected");
  return {
    items: sortFeed(items),
    error: failed?.status === "rejected" ? errorMessage(failed.reason) : null,
  };
}

export function useCommunityItems(): CommunityItemsState {
  const { userId } = useSession();
  const { loaded, reload } = useLoader(userId, load);
  const ready = loaded !== null && loaded.scope === userId ? loaded.value : null;
  return useMemo(
    () => ({
      items: ready?.items ?? [],
      loading: ready === null,
      error: ready?.error ?? null,
      reload,
    }),
    [ready, reload],
  );
}
