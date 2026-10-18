// Community (Module 2) data model.
// Based on the shared DemoMetadata / CommunityItem contract in DESIGN_SYSTEM.md section 12,
// specialised per category so each card gets the exact fields it needs.

export type DemoMetadata = {
  id: string;
  townshipId: string;
  title: string;
  summary: string;
  updatedAt: string; // ISO 8601
  sourceLabel: string;
  isDemoData: boolean;
};

export type CommunityCategory = "event" | "maintenance" | "volunteer" | "township";

// Maintenance announcements - DISTINCT from safety facility reports.
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed";

export type EventItem = DemoMetadata & {
  category: "event";
  startsAt: string; // ISO 8601
  durationMinutes: number;
  location: string;
  audience: string;
  capacity?: number;
  signupCount?: number;
  // Live events only: whether the signed-in demo user has joined.
  joined?: boolean;
};

export type MaintenanceItem = DemoMetadata & {
  category: "maintenance";
  location: string; // affected area
  windowStart: string; // ISO 8601 - scheduled window start
  windowEnd: string; // ISO 8601 - scheduled window end
  serviceImpact: string;
  status: MaintenanceStatus;
};

export type VolunteerItem = DemoMetadata & {
  category: "volunteer";
  organisation: string;
  startsAt: string; // ISO 8601
  location: string;
  slotsAvailable?: number; // only shown if known
};

export type TownshipUpdateItem = DemoMetadata & {
  category: "township";
  publishedAt: string; // ISO 8601
  topic: string;
  priority: "normal" | "high";
};

export type CommunityItem = EventItem | MaintenanceItem | VolunteerItem | TownshipUpdateItem;
