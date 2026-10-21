import type { CommunityEvent, Notice } from "@sdh/contracts";

import type { CommunityItem, TownshipUpdateItem } from "../types/community";

export type CommunityCategory = CommunityItem["category"];

// The ?tab= value for each community category, and the plain name shown for it.
export const COMMUNITY_TAB_PARAM: Record<CommunityCategory, string> = {
  event: "events",
  maintenance: "notices",
  volunteer: "volunteer",
  township: "updates",
};
export const COMMUNITY_TAB_LABEL: Record<CommunityCategory, string> = {
  event: "Events",
  maintenance: "Notices",
  volunteer: "Volunteer",
  township: "Updates",
};

export function communityTabPath(category: CommunityCategory): string {
  return `/community?tab=${COMMUNITY_TAB_PARAM[category]}`;
}

// The category a ?tab= value names; anything else falls back to events.
export function communityCategoryFromParam(value: string | null): CommunityCategory {
  const match = (Object.keys(COMMUNITY_TAB_PARAM) as CommunityCategory[]).find(
    (category) => COMMUNITY_TAB_PARAM[category] === value,
  );
  return match ?? "event";
}

export function noticeToItem(notice: Notice): CommunityItem {
  const base = {
    id: notice.id,
    title: notice.title,
    summary: notice.description,
    publishedAt: notice.publishedAt,
    updatedAt: notice.updatedAt,
    source: notice.source,
  };
  if (notice.kind === "maintenance") {
    return {
      ...base,
      category: "maintenance",
      location: notice.area,
      windowStart: notice.windowStart ?? notice.publishedAt,
      windowEnd: notice.windowEnd ?? notice.publishedAt,
      serviceImpact: notice.impact ?? notice.description,
      status: notice.status ?? "scheduled",
    };
  }
  return { ...base, category: "township", topic: notice.topic, priority: notice.priority };
}

export function eventToItem(event: CommunityEvent): CommunityItem {
  const base = {
    id: event.id,
    title: event.title,
    summary: event.description,
    publishedAt: event.createdAt,
    updatedAt: event.updatedAt,
    startsAt: event.startsAt,
    durationMinutes: event.durationMinutes,
    location: event.location.area,
    organiser: event.organiser,
    joined: event.joined,
  };
  if (event.purpose === "volunteer_drive") {
    return {
      ...base,
      category: "volunteer",
      slotsAvailable: Math.max(0, event.capacity - event.signupCount),
    };
  }
  return {
    ...base,
    category: "event",
    eventType: event.category,
    capacity: event.capacity,
    signupCount: event.signupCount,
  };
}

// Newest first.
export function sortFeed(items: CommunityItem[]): CommunityItem[] {
  return [...items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

// The first high-priority township update, else the newest item.
export function pickFeatured(items: CommunityItem[]): CommunityItem | undefined {
  const urgent = items.find(
    (item): item is TownshipUpdateItem => item.category === "township" && item.priority === "high",
  );
  return urgent ?? items[0];
}
