import type { RequestStatus } from "@sdh/contracts";
import type { AlertLevel } from "../types/safety";

// Plain-language text for each status a resident can see.
export const STATUS_TEXT: Record<RequestStatus, string> = {
  pending_review: "Being checked",
  open: "Finding a volunteer",
  matched: "Volunteer coming",
  completed: "Completed",
  rejected: "Not accepted",
  cancelled: "Cancelled",
};

// Badge colour family per status. Green is kept for good news only.
export type BadgeTone = "info" | "warning" | "success" | "danger";

export const STATUS_TONE: Record<RequestStatus, BadgeTone> = {
  pending_review: "info",
  open: "warning",
  matched: "success",
  completed: "success",
  rejected: "danger",
  cancelled: "danger",
};

// A volunteer name is shown once one has taken the request.
export function showsVolunteer(status: RequestStatus): boolean {
  return status === "matched" || status === "completed";
}

// The server accepts a cancel while the request is being checked or still open.
export function canCancel(status: RequestStatus): boolean {
  return status === "pending_review" || status === "open";
}

// Township condition severity scale (used by the Home carousel).
// One 5-step ramp, 1 safest to 5 most severe. The colours live in @sdh/design-tokens
// and reach each card through its data-severity attribute.
export type Severity = 1 | 2 | 3 | 4 | 5;

// Top of the Air Pollutant Index bar; readings above it fill the bar.
export const HAZE_API_SCALE_MAX = 300;

// Map an Air Pollutant Index (Malaysia) to the shared severity ramp.
export function apiSeverity(api: number): Severity {
  if (api <= 50) return 1;
  if (api <= 75) return 2;
  if (api <= 100) return 3;
  if (api <= 200) return 4;
  return 5;
}

// Map the temperature alert level to the shared severity ramp.
export function tempSeverity(level: AlertLevel): Severity {
  if (level === "normal") return 2;
  if (level === "warning") return 4;
  return 5;
}

// Map a facility repair status to the shared severity ramp.
export function facilitySeverity(status: "reported" | "in_progress" | "fixed"): Severity {
  if (status === "fixed") return 1;
  if (status === "in_progress") return 3;
  return 5; // reported but untouched
}
