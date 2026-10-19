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
