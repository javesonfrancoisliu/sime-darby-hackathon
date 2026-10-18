export type HazardLevel = "good" | "moderate" | "unhealthy" | "hazardous";

export type AlertLevel = "normal" | "warning" | "danger";

// ── Haze / Air Quality ───────────────────────────────
export interface HazeReading {
  location: string;
  api: number; // Air Pollutant Index (Malaysia standard)
  level: HazardLevel;
  updatedAt: string;
  recommendation: string;
}

// ── Water Levels ─────────────────────────────────────
export type WaterStatus = "normal" | "watch" | "warning" | "danger";

export interface WaterLevelReading {
  name: string;
  type: "river" | "lake";
  levelM: number; // current level in metres
  normalMaxM: number; // normal max level in metres
  status: WaterStatus;
  updatedAt: string;
}

// ── Temperature ──────────────────────────────────────
export interface TemperatureAlert {
  location: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number; // percent
  level: AlertLevel;
  updatedAt: string;
  advisory?: string;
}

// ── Broken / Damaged Facilities ──────────────────────
export type FacilityStatus = "reported" | "in_progress" | "fixed";

export interface FacilityReport {
  id: string;
  title: string;
  location: string;
  category: string;
  status: FacilityStatus;
  reportedAt: string;
  updatedAt: string;
  description: string;
}
