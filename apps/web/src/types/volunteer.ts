import type { Category, Verification } from "@sdh/contracts";

// Young-role volunteering (Township Connect) view models.
// Derived from the backend contracts (@sdh/contracts) Opportunity / Contribution,
// flattened into the exact fields the opportunity cards and impact panel need.

export type TaskCategory = Category;

export type OpportunityKind = "request" | "event";

// "past" is a start time that has already gone by.
export type Urgency = "low" | "medium" | "high" | "past";

export type Opportunity = {
  id: string;
  kind: OpportunityKind;
  title: string;
  summary: string;
  category: TaskCategory;
  // Approximate distance in km (0.5 km steps), measured by the server from the saved area.
  distanceKm: number;
  area: string;
  scheduledAt: string; // ISO 8601
  durationMinutes: number;
  // 0–100 rule-based fit score from the matching module.
  matchScore: number;
  matchSource?: "ai" | "rules";
  explanationSource?: "ai" | "rules";
  matchRank?: number;
  // Short human reasons for the match, e.g. "Matches your Saturdays".
  reasons: string[];
  // Kept for future scheduling features; no longer surfaced as a filter.
  fitsMySchedule: boolean;
};

export const URGENCY_RANK: Record<Urgency, number> = { high: 0, medium: 1, low: 2, past: 3 };

export const URGENCY_LABEL: Record<Urgency, string> = {
  high: "Urgent",
  medium: "Soon",
  low: "Flexible",
  past: "Started",
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
};

export type VerificationStatus = Verification;

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  groceries: "Groceries",
  transport: "Transport",
  digital_literacy: "Tech help",
  health_literacy: "Health literacy",
  home_help: "Home help",
  community_activity: "Community",
};
