// Young-role volunteering (Help a Neighbour) view models.
// Derived from the backend contracts (@sdh/contracts) Opportunity / Contribution,
// flattened into the exact fields the opportunity cards and impact panel need.

export type TaskCategory =
  | "groceries"
  | "transport"
  | "digital_literacy"
  | "health_literacy"
  | "home_help"
  | "community_activity";

export type OpportunityKind = "request" | "event";

export type Urgency = "low" | "medium" | "high";

export type Opportunity = {
  id: string;
  kind: OpportunityKind;
  title: string;
  summary: string;
  category: TaskCategory;
  // Approximate area centroid (never an exact residential address). Used to
  // compute distance from the volunteer's live location when permission is
  // granted. Optional: API-sourced items omit it for privacy, falling back to
  // the baked `distanceKm`.
  coords?: { lat: number; lng: number };
  // Approximate fallback distance in km (0.5 km steps) when geolocation is off.
  distanceKm: number;
  area: string;
  scheduledAt: string; // ISO 8601
  durationMinutes: number;
  // How time-sensitive the request is. Drives the "Most urgent" sort.
  urgency: Urgency;
  // 0–100 rule-based fit score from the matching module.
  matchScore: number;
  // Short human reasons for the match, e.g. "Matches your Saturdays".
  reasons: string[];
  // Kept for future scheduling features; no longer surfaced as a filter.
  fitsMySchedule: boolean;
  // Optional shared identity for the underlying real-world activity. When this
  // matches a Challenge's dedupeKey, verifying this volunteering task and
  // completing that challenge award points only once (counted as one task).
  dedupeKey?: string;
  isDemoData: boolean;
  sourceLabel: string;
};

export const URGENCY_RANK: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };

export const URGENCY_LABEL: Record<Urgency, string> = {
  high: "Urgent",
  medium: "Soon",
  low: "Flexible",
};

// NOTE: SHORT_TASK_MAX_MINUTES (the old "short tasks only" filter threshold) was
// removed with that filter. Re-add here if a future feature needs it.

export type Contribution = {
  id: string;
  title: string;
  source: OpportunityKind;
  minutes: number;
  completedAt: string; // ISO 8601
};

export type ImpactSummary = {
  totalMinutes: number;
  completedCount: number;
  // Distinct neighbours helped (may differ from completedCount for group tasks).
  peopleHelped: number;
  items: Contribution[];
  isDemoData: boolean;
};

export type VerificationStatus = "verified" | "pending" | "rejected" | "not_required";

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  groceries: "Groceries",
  transport: "Transport",
  digital_literacy: "Tech help",
  health_literacy: "Health literacy",
  home_help: "Home help",
  community_activity: "Community",
};
