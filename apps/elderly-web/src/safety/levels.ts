import type { AirLevel, FacilityStatus, HeatLevel, WaterLevel } from "@sdh/contracts";

// One place for the words and colour of each safety reading, so Home and the
// Safety page always show the same reading the same way.

export type Tone = "good" | "caution" | "alert" | "extreme" | "solid-danger";
export interface LevelInfo {
  tone: Tone;
  label: string;
}

export const HAZARD_LEVEL: Record<AirLevel, LevelInfo> = {
  good: { tone: "good", label: "Good" },
  moderate: { tone: "caution", label: "Moderate" },
  unhealthy: { tone: "alert", label: "Unhealthy" },
  hazardous: { tone: "extreme", label: "Hazardous" },
};

export const WATER_STATUS: Record<WaterLevel, LevelInfo> = {
  normal: { tone: "good", label: "Normal" },
  watch: { tone: "caution", label: "Watch" },
  warning: { tone: "alert", label: "Warning" },
  danger: { tone: "solid-danger", label: "Danger" },
};

export const ALERT_LEVEL: Record<HeatLevel, LevelInfo> = {
  normal: { tone: "good", label: "Normal" },
  warning: { tone: "caution", label: "Heat Advisory" },
  danger: { tone: "alert", label: "Extreme Heat" },
};

export const FACILITY_STATUS: Record<FacilityStatus, LevelInfo> = {
  reported: { tone: "alert", label: "Reported" },
  in_progress: { tone: "caution", label: "In Progress" },
  resolved: { tone: "good", label: "Fixed" },
};

// Top of the Air Pollutant Index bar; readings above it fill the bar.
export const HAZE_API_SCALE_MAX = 300;

// The Home cards use a 5-step ramp, 1 safest to 5 most severe. The colours live
// in @sdh/design-tokens and reach each card through its data-severity attribute.
export type Severity = 1 | 2 | 3 | 4 | 5;

const SEVERITY_BY_TONE: Record<Tone, Severity> = {
  good: 1,
  caution: 3,
  alert: 4,
  extreme: 5,
  "solid-danger": 5,
};

export function severityOf(info: LevelInfo): Severity {
  return SEVERITY_BY_TONE[info.tone];
}
