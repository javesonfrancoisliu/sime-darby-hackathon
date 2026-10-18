import type { RequestStatus, HelpCategory } from "../api/client";
import type { AlertLevel } from "../mock/safetyData";

/** Human-readable text for each status (Req 6.3, 7.2). */
export const STATUS_TEXT: Record<RequestStatus, string> = {
  pending: "Waiting to be matched",
  matched: "Matched",
  in_progress: "Help in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * Shared StatusBadge colour family per status, matching the design doc's
 * status table. Values are the design system's semantic badge modifiers,
 * not new colours.
 */
export type BadgeTone = "info" | "warning" | "success" | "danger";

export const STATUS_TONE: Record<RequestStatus, BadgeTone> = {
  pending: "info",
  matched: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

/** Volunteer name is shown iff status is matched/in_progress/completed (Req 7.1). */
export function showsVolunteer(status: RequestStatus): boolean {
  return status === "matched" || status === "in_progress" || status === "completed";
}

/** Cancel is offered only while pending (Req 8.1). */
export function canCancel(status: RequestStatus): boolean {
  return status === "pending";
}

export const CATEGORY_TEXT: Record<HelpCategory | "technology_learning", string> = {
  groceries: "Groceries",
  transport: "Transport",
  technology_learning: "Digital Literacy",
  digital_literacy: "Digital Literacy",
  volunteer_support: "Volunteer Support & Home Fixes",
  health_literacy: "Health Literacy & Events",
};

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

export interface CategoryDetail {
  id: HelpCategory;
  title: string;
  subtitle: string;
  description: string;
}

export const ELDERLY_SUPPORT_CATEGORIES: CategoryDetail[] = [
  {
    id: "groceries",
    title: "Grocery Trip Together",
    subtitle: "A trip to groceries together with younger volunteers",
    description: "Get paired with a friendly neighbourhood youth volunteer to shop for fresh market produce or household essentials together.",
  },
  {
    id: "transport",
    title: "Transport to Amenities",
    subtitle: "Transport to nearby clinic, groceries, or daily errands",
    description: "Safe, guided rides to local clinics, pharmacies, post offices, or township community centres.",
  },
  {
    id: "digital_literacy",
    title: "Digital Literacy Guidance",
    subtitle: "Learn smartphone apps, e-wallets, video calls & AI",
    description: "Patient, one-on-one guidance from youth volunteers on using Touch 'n Go, WhatsApp video calls, online banking, and AI tools.",
  },
  {
    id: "volunteer_support",
    title: "Youth Support & Repairs",
    subtitle: "Volunteers from younger neighbourhoods support & help",
    description: "Assistance with light household fixes, bulb replacement, moving bulky items, gardening, or friendly companionship.",
  },
  {
    id: "health_literacy",
    title: "Health Literacy & Events",
    subtitle: "Guidance on wellness, screenings & community sessions",
    description: "Support understanding medication schedules, accompanying you to health screenings, and attending wellness sessions.",
  },
];
