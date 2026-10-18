import type { RequestStatus } from "@sdh/contracts";
import type { AlertLevel } from "../mock/safetyData";

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

/* ─────────────────────────────────────────────────────────
   Township condition severity scale (used by the Home carousel).
   A single 5-step ramp so every live-condition card reads at a
   glance: calm → caution → alarm. Order: 1 safest → 5 most severe.
   Each step carries an accent (chip/bar/stripe), a soft chip bg,
   and a readable text colour that meets >=4.5:1 on the chip bg.
───────────────────────────────────────────────────────── */
export type Severity = 1 | 2 | 3 | 4 | 5;

export interface SeverityStyle {
  /** Strong accent — progress bar, left stripe, icon tint. */
  accent: string;
  /** Soft chip background. */
  chipBg: string;
  /** Chip text (AA on chipBg). */
  chipText: string;
}

export const SEVERITY_SCALE: Record<Severity, SeverityStyle> = {
  1: { accent: "#22C55E", chipBg: "#DCFCE7", chipText: "#15803D" }, // light green — all clear
  2: { accent: "#16A34A", chipBg: "#D1FAE5", chipText: "#065F46" }, // green — good
  3: { accent: "#EAB308", chipBg: "#FEF9C3", chipText: "#713F12" }, // yellow — moderate
  4: { accent: "#F97316", chipBg: "#FFEDD5", chipText: "#9A3412" }, // orange — advisory
  5: { accent: "#DC2626", chipBg: "#FEE2E2", chipText: "#991B1B" }, // red — severe
};

/** Map an Air Pollutant Index (Malaysia) to the shared severity ramp. */
export function apiSeverity(api: number): Severity {
  if (api <= 50) return 1;
  if (api <= 75) return 2;
  if (api <= 100) return 3;
  if (api <= 200) return 4;
  return 5;
}

/** Map the temperature alert level to the shared severity ramp. */
export function tempSeverity(level: AlertLevel): Severity {
  if (level === "normal") return 2;
  if (level === "warning") return 4;
  return 5;
}

/** Map a facility repair status to the shared severity ramp. */
export function facilitySeverity(status: "reported" | "in_progress" | "fixed"): Severity {
  if (status === "fixed") return 1;
  if (status === "in_progress") return 3;
  return 5; // reported but untouched
}
