import type { EventCategory, MaintenanceStatus } from "@sdh/contracts";

// View models for the community feed, mapped from notices and events.

export type { MaintenanceStatus };

type FeedBase = {
  id: string;
  title: string;
  summary: string;
  // When it went out; the feed is newest first.
  publishedAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

export type CommunityCategory = "event" | "maintenance" | "volunteer" | "township";

export type EventItem = FeedBase & {
  category: "event";
  eventType: EventCategory;
  startsAt: string;
  durationMinutes: number;
  location: string;
  organiser: string;
  capacity: number;
  signupCount: number;
  joined?: boolean;
};

export type MaintenanceItem = FeedBase & {
  category: "maintenance";
  location: string; // affected area
  windowStart: string;
  windowEnd: string;
  serviceImpact: string;
  status: MaintenanceStatus;
  source: string;
};

// A volunteer drive: an event whose purpose is volunteering.
export type VolunteerItem = FeedBase & {
  category: "volunteer";
  organiser: string;
  startsAt: string;
  durationMinutes: number;
  location: string;
  slotsAvailable: number;
  joined?: boolean;
};

export type TownshipUpdateItem = FeedBase & {
  category: "township";
  topic: string;
  priority: "normal" | "high";
  source: string;
};

export type CommunityItem = EventItem | MaintenanceItem | VolunteerItem | TownshipUpdateItem;
