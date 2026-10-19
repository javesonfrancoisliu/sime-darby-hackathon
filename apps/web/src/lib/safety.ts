import type { FacilityStatus, SafetyReading } from "@sdh/contracts";

import type { BadgeVariant } from "./status";

export type ReadingLevel = SafetyReading["level"];

export const LEVEL_LABEL: Record<ReadingLevel, string> = {
  good: "Good",
  moderate: "Moderate",
  unhealthy: "Unhealthy",
  hazardous: "Hazardous",
  normal: "Normal",
  watch: "Watch",
  warning: "Warning",
  danger: "Danger",
};

export const LEVEL_VARIANT: Record<ReadingLevel, BadgeVariant> = {
  good: "success",
  normal: "success",
  moderate: "info",
  watch: "info",
  unhealthy: "warning",
  warning: "warning",
  hazardous: "danger",
  danger: "danger",
};

// Higher means worse, so the Home summary can show the reading that needs attention first.
const LEVEL_SEVERITY: Record<ReadingLevel, number> = {
  good: 0,
  normal: 0,
  moderate: 1,
  watch: 1,
  unhealthy: 2,
  warning: 2,
  hazardous: 3,
  danger: 3,
};

export function worstReading<T extends SafetyReading>(readings: T[]): T | undefined {
  return readings.reduce<T | undefined>(
    (worst, r) =>
      worst === undefined || LEVEL_SEVERITY[r.level] > LEVEL_SEVERITY[worst.level] ? r : worst,
    undefined,
  );
}

export const FACILITY_STATUS: Record<FacilityStatus, { label: string; variant: BadgeVariant }> = {
  reported: { label: "Reported", variant: "warning" },
  in_progress: { label: "In progress", variant: "info" },
  resolved: { label: "Resolved", variant: "success" },
};

export const READING_TITLE = { air: "Air quality", water: "Water levels", heat: "Heat" } as const;

// 1 (safest) to 5 (most severe), matching the shared --sev-* ramp in
// @sdh/design-tokens. Mirrors the elderly home's tone→severity mapping so both
// roles colour the same reading the same way. Each reading level maps straight
// to a step; the card exposes it via a data-severity attribute.
export const LEVEL_SEVERITY_STEP: Record<ReadingLevel, 1 | 2 | 3 | 4 | 5> = {
  good: 1,
  normal: 1,
  moderate: 3,
  watch: 3,
  warning: 4,
  unhealthy: 4,
  hazardous: 5,
  danger: 5,
};
