/* ─────────────────────────────────────────────────────────
   Mock Safety Data — Health & Safety Hazards
   All values are illustrative only; replace with live APIs.
───────────────────────────────────────────────────────── */

export type HazardLevel = "good" | "moderate" | "unhealthy" | "hazardous";
export type AlertLevel  = "normal" | "warning" | "danger";

/* ── Haze / Air Quality ─────────────────────────────── */
export interface HazeReading {
  location: string;
  api: number;          // Air Pollutant Index (Malaysia standard)
  level: HazardLevel;
  updatedAt: string;
  recommendation: string;
}

export const HAZE_DATA: HazeReading[] = [
  {
    location: "Elmina West",
    api: 58,
    level: "moderate",
    updatedAt: "Today, 7:00 am",
    recommendation: "Sensitive groups should limit outdoor activity.",
  },
  {
    location: "Elmina East",
    api: 72,
    level: "moderate",
    updatedAt: "Today, 7:00 am",
    recommendation: "Wear a mask if staying outdoors for long periods.",
  },
  {
    location: "City of Elmina",
    api: 34,
    level: "good",
    updatedAt: "Today, 7:00 am",
    recommendation: "Air quality is satisfactory. Enjoy outdoor activities.",
  },
];

/* ── Water Levels ───────────────────────────────────── */
export type WaterStatus = "normal" | "watch" | "warning" | "danger";

export interface WaterLevelReading {
  name: string;
  type: "river" | "lake";
  levelM: number;      // current level in metres
  normalMaxM: number;  // normal max level in metres
  status: WaterStatus;
  updatedAt: string;
}

export const WATER_LEVELS: WaterLevelReading[] = [
  {
    name: "Sungai Buloh",
    type: "river",
    levelM: 1.4,
    normalMaxM: 2.5,
    status: "normal",
    updatedAt: "Today, 6:30 am",
  },
  {
    name: "Elmina Lake",
    type: "lake",
    levelM: 3.8,
    normalMaxM: 4.0,
    status: "watch",
    updatedAt: "Today, 6:30 am",
  },
  {
    name: "Central Canal",
    type: "river",
    levelM: 2.1,
    normalMaxM: 2.5,
    status: "normal",
    updatedAt: "Today, 6:30 am",
  },
];

/* ── Temperature ────────────────────────────────────── */
export interface TemperatureAlert {
  location: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;    // percent
  level: AlertLevel;
  updatedAt: string;
  advisory?: string;
}

export const TEMPERATURE_DATA: TemperatureAlert = {
  location: "Elmina West",
  tempC: 35,
  feelsLikeC: 41,
  humidity: 78,
  level: "warning",
  updatedAt: "Today, 8:00 am",
  advisory: "Heat advisory in effect. Stay hydrated and avoid prolonged sun exposure between 11 am–3 pm.",
};

/* ── Broken / Damaged Facilities ────────────────────── */
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

export const FACILITY_REPORTS: FacilityReport[] = [
  {
    id: "F001",
    title: "Broken street light",
    location: "Jalan Elmina 3, near playground",
    category: "Street Lighting",
    status: "in_progress",
    reportedAt: "14 Oct 2026",
    updatedAt: "15 Oct 2026",
    description: "Street light has been out for 3 nights. Crew dispatched.",
  },
  {
    id: "F002",
    title: "Damaged park bench",
    location: "Central Park, Zone B",
    category: "Park Furniture",
    status: "reported",
    reportedAt: "15 Oct 2026",
    updatedAt: "15 Oct 2026",
    description: "Two planks broken on the bench near the fountain.",
  },
  {
    id: "F003",
    title: "Pothole on main road",
    location: "Persiaran Elmina Barat 1",
    category: "Road",
    status: "fixed",
    reportedAt: "10 Oct 2026",
    updatedAt: "13 Oct 2026",
    description: "Large pothole patched and road surface resurfaced.",
  },
  {
    id: "F004",
    title: "Clogged drain",
    location: "Elmina Boulevard, Block C",
    category: "Drainage",
    status: "in_progress",
    reportedAt: "13 Oct 2026",
    updatedAt: "16 Oct 2026",
    description: "Drain cleared 60%. Second pass scheduled for tomorrow.",
  },
  {
    id: "F005",
    title: "Faulty playground equipment",
    location: "Taman Elmina West, Playground 2",
    category: "Playground",
    status: "reported",
    reportedAt: "16 Oct 2026",
    updatedAt: "16 Oct 2026",
    description: "Swing seat detached. Area cordoned off for safety.",
  },
  {
    id: "F006",
    title: "Burst water pipe",
    location: "Jalan Elmina 7",
    category: "Water Supply",
    status: "fixed",
    reportedAt: "8 Oct 2026",
    updatedAt: "9 Oct 2026",
    description: "Pipe repaired and road reinstated. Water supply restored.",
  },
];
