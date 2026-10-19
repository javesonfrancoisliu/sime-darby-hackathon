import {
  BadgeWithEarned,
  ChallengeWithProgress,
  FacilityReport,
  HelpRequest,
  MedicalId,
  Notice,
  RewardWithStatus,
  SafetyReading,
  Streak,
  Township,
  User,
} from "@sdh/contracts";

// Fixtures are parsed with the contract schemas so a drifting shape fails the test.
export const ELDER = User.parse({
  id: "5b0d3a52-6f0a-4c33-9d7e-0a1f6c1d2e01",
  role: "elder",
  name: "Puan Salmah",
  area: "Elmina Valley",
  location: { lat: 3.2, lng: 101.5 },
  skills: [],
  experience: "",
  availability: [],
  verification: "not_required",
  createdAt: "2026-10-01T09:00:00+08:00",
  updatedAt: "2026-10-01T09:00:00+08:00",
});

export const OTHER_ELDER = User.parse({
  ...ELDER,
  id: "7c1e4b63-7a1b-4d44-8e8f-1b2a7d2e3f02",
  name: "Encik Hamid",
  area: "Elmina West",
});

export function makeRequest(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return HelpRequest.parse({
    id: "9d2f5c74-8b2c-4e55-9f90-2c3b8e3f4a03",
    elderId: ELDER.id,
    elderName: ELDER.name,
    category: "groceries",
    title: "Groceries",
    description: "Milk and bread",
    scheduledAt: "2026-10-20T09:00:00+08:00",
    durationMinutes: 60,
    location: { lat: ELDER.location.lat, lng: ELDER.location.lng, area: ELDER.area },
    status: "open",
    createdAt: "2026-10-18T09:00:00+08:00",
    updatedAt: "2026-10-18T09:00:00+08:00",
    ...overrides,
  });
}

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const WHEN = "2026-10-19T09:00:00+08:00";

export const TOWNSHIP = Township.parse({
  id: "elmina",
  name: "Elmina",
  securityLine: { display: "03-5000 1234", tel: "0350001234" },
  emergencyNumber: "999",
  updatedAt: WHEN,
});

export const AIR = SafetyReading.parse({
  type: "air",
  area: "Elmina Valley",
  value: 82,
  unit: "API",
  level: "moderate",
  advice: "Sensitive groups should limit time outdoors.",
  measuredAt: WHEN,
});

export const WATER_ROWS = [
  { name: "Sungai Buloh", value: 1.4, normalMax: 3, level: "normal" },
  { name: "Lake Elmina", value: 2.1, normalMax: 2.8, level: "watch" },
  { name: "Retention pond", value: 3.8, normalMax: 4, level: "danger" },
].map((w) =>
  SafetyReading.parse({
    type: "water",
    area: "Elmina Valley",
    waterBody: w.name === "Sungai Buloh" ? "river" : "lake",
    unit: "m",
    advice: "Stay away from the water edge.",
    measuredAt: WHEN,
    ...w,
  }),
);

export const HEAT = SafetyReading.parse({
  type: "heat",
  area: "Elmina Valley",
  value: 34,
  unit: "°C",
  feelsLike: 39,
  humidity: 70,
  level: "warning",
  advice: "Drink water and rest in the shade.",
  measuredAt: WHEN,
});

export const FACILITIES = [
  { id: ID(31), title: "Broken streetlight", status: "in_progress" },
  { id: ID(32), title: "Cracked bench", status: "resolved" },
  { id: ID(33), title: "Leaking tap", status: "reported" },
].map((f) =>
  FacilityReport.parse({
    area: "Elmina Valley",
    category: "Lighting",
    description: "Needs a repair.",
    reportedAt: WHEN,
    updatedAt: WHEN,
    ...f,
  }),
);

export const MAINTENANCE = Notice.parse({
  id: ID(41),
  kind: "maintenance",
  title: "Water supply cut",
  description: "",
  area: "Elmina West",
  topic: "Water",
  priority: "normal",
  source: "Township office",
  publishedAt: WHEN,
  windowStart: "2026-10-22T09:00:00+08:00",
  windowEnd: "2026-10-22T13:00:00+08:00",
  impact: "No water in the morning.",
  status: "scheduled",
  createdBy: ID(2),
  createdAt: WHEN,
  updatedAt: WHEN,
});

export const UPDATE_NOTICE = Notice.parse({
  ...MAINTENANCE,
  id: ID(42),
  kind: "update",
  title: "Clinic opens on Saturday",
  description: "The clinic is open this Saturday.",
  topic: "Health",
  priority: "high",
  windowStart: undefined,
  windowEnd: undefined,
  impact: undefined,
  status: undefined,
});

export const TEAM_CHALLENGE = ChallengeWithProgress.parse({
  id: ID(51),
  title: "Walk 500 steps together",
  description: "Every neighbour adds a part.",
  icon: "walk",
  category: "fitness",
  mode: "team",
  audience: "all",
  goal: { target: 500, unit: "steps", type: "count" },
  points: 0,
  teamReward: "Tea party",
  requiresVerification: false,
  endsOn: "2026-11-30T23:59:00+08:00",
  createdBy: ID(2),
  createdAt: WHEN,
  updatedAt: WHEN,
  ended: false,
  teamProgress: { precinct: "Elmina Valley", current: 120 },
});

export const STREAK = Streak.parse({ current: 3, best: 5, recent: [] });

export const REWARD = RewardWithStatus.parse({
  id: ID(61),
  title: "Free kopi",
  description: "",
  pointsCost: 80,
  partner: "Kopi Corner",
  icon: "coffee",
  audience: "all",
  category: "food",
  active: true,
  createdAt: WHEN,
  updatedAt: WHEN,
  status: "available",
});

export const BADGE = BadgeWithEarned.parse({
  id: ID(71),
  title: "First step",
  description: "Check in once.",
  icon: "star",
  kind: "points",
  threshold: 10,
  audience: "all",
  createdAt: WHEN,
  earned: true,
});

export const POINTS = (points: number) => ({
  points,
  lifetimePoints: points,
  ledger: { items: [] },
});

export const MEDICAL = MedicalId.parse({
  bloodGroup: "O+",
  nextOfKinName: "Zainal",
  nextOfKinRelation: "Son",
  nextOfKinPhone: "012-345 6789",
  updatedAt: WHEN,
});

export const MEDICAL_ROUTE = "/api/me/medical-id";
export const NOT_FOUND = { status: 404, body: { error: { code: "NOT_FOUND", message: "none" } } };
