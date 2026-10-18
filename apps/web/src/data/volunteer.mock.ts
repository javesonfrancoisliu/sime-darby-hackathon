import { urgencyFor } from "../lib/urgency";
import type { Contribution, ImpactSummary, Opportunity } from "../types/volunteer";

// Demo volunteering data for the young role. Dates are ISO 8601 with the
// Malaysia offset (+08:00). All flagged as demo data so the UI can label it.
//
// `coords` are approximate area centroids around a fictional City of Elmina, never
// exact residential addresses. The baked `distanceKm` is the fallback shown when
// the volunteer's live geolocation is unavailable.

// Rough anchor for the demo township (used only to scatter nearby coords).
const BASE = { lat: 3.0738, lng: 101.5183 };
// ~0.009 degrees latitude ≈ 1 km here; good enough for demo scatter.
const KM = 0.009;

// Urgency is derived from the start time (same rule as live data), not hand-set.
const MOCK_OPPORTUNITY_BASE: Omit<Opportunity, "urgency">[] = [
  {
    id: "opp-grocery-ahmad",
    kind: "request",
    title: "Weekly grocery run",
    summary: "Carry and deliver a small grocery list from the market to Block A.",
    category: "groceries",
    coords: { lat: BASE.lat + 0.3 * KM, lng: BASE.lng + 0.4 * KM },
    distanceKm: 0.5,
    area: "Block A, Elmina West",
    scheduledAt: "2026-10-18T09:30:00+08:00",
    durationMinutes: 45,
    matchScore: 92,
    reasons: ["Very close to you", "Matches your Saturday mornings"],
    fitsMySchedule: true,
    isDemoData: true,
    sourceLabel: "Help a Neighbour",
  },
  {
    id: "opp-phone-setup",
    kind: "request",
    title: "Set up video calls on a phone",
    summary: "Help a senior install and try a video-call app to reach family.",
    category: "digital_literacy",
    coords: { lat: BASE.lat + 0.9 * KM, lng: BASE.lng - 0.5 * KM },
    distanceKm: 1,
    area: "Block C, Elmina West",
    scheduledAt: "2026-10-18T16:00:00+08:00",
    durationMinutes: 30,
    matchScore: 88,
    reasons: ["Matches your tech help skill", "Short task"],
    fitsMySchedule: true,
    isDemoData: true,
    sourceLabel: "Help a Neighbour",
  },
  {
    id: "opp-clinic-ride",
    kind: "request",
    title: "Ride to the health clinic",
    summary: "Accompany a neighbour to a routine clinic appointment and back.",
    category: "transport",
    coords: { lat: BASE.lat - 1.6 * KM, lng: BASE.lng + 1.1 * KM },
    distanceKm: 2,
    area: "City of Elmina",
    scheduledAt: "2026-10-20T08:00:00+08:00",
    durationMinutes: 90,
    matchScore: 74,
    reasons: ["Within your travel radius"],
    fitsMySchedule: false,
    isDemoData: true,
    sourceLabel: "Help a Neighbour",
  },
  {
    id: "opp-reading-event",
    kind: "event",
    title: "Reading buddies for children",
    summary: "Spend a short session reading with primary-school kids after class.",
    category: "community_activity",
    coords: { lat: BASE.lat + 1.2 * KM, lng: BASE.lng + 0.9 * KM },
    distanceKm: 1.5,
    area: "Reading Room, Block C",
    scheduledAt: "2026-10-22T17:00:00+08:00",
    durationMinutes: 60,
    matchScore: 69,
    reasons: ["Popular community activity"],
    fitsMySchedule: true,
    isDemoData: true,
    sourceLabel: "Residents' Committee",
  },
  {
    id: "opp-medicine-pickup",
    kind: "request",
    title: "Pharmacy pickup",
    summary: "Collect a prepaid prescription and drop it at a neighbour's door.",
    category: "home_help",
    coords: { lat: BASE.lat - 0.3 * KM, lng: BASE.lng - 0.4 * KM },
    distanceKm: 0.5,
    area: "Block B, Elmina West",
    scheduledAt: "2026-10-19T11:00:00+08:00",
    durationMinutes: 20,
    matchScore: 81,
    reasons: ["Very close to you", "Short task"],
    fitsMySchedule: true,
    isDemoData: true,
    sourceLabel: "Help a Neighbour",
  },
  {
    id: "opp-health-talk",
    kind: "request",
    title: "Explain a health leaflet",
    summary: "Read through a clinic leaflet with a senior and answer questions.",
    category: "health_literacy",
    coords: { lat: BASE.lat + 2.4 * KM, lng: BASE.lng - 1.8 * KM },
    distanceKm: 3,
    area: "Block D, Elmina West",
    scheduledAt: "2026-10-21T15:30:00+08:00",
    durationMinutes: 25,
    matchScore: 63,
    reasons: ["Short task"],
    fitsMySchedule: false,
    isDemoData: true,
    sourceLabel: "Help a Neighbour",
  },
  {
    // Same underlying activity as the "Central Park clean-up" challenge
    // (shared dedupeKey): verifying this volunteering task AND completing that
    // challenge award points only once, but it still counts as one verified task.
    id: "opp-cleanup-central-green",
    kind: "event",
    title: "Central Park clean-up",
    summary: "Join the Saturday neighbourhood clean-up at Central Park.",
    category: "community_activity",
    coords: { lat: BASE.lat + 1.1 * KM, lng: BASE.lng + 1.0 * KM },
    distanceKm: 1.5,
    area: "Central Park, City of Elmina",
    scheduledAt: "2026-10-24T08:30:00+08:00",
    durationMinutes: 120,
    matchScore: 70,
    reasons: ["Popular community activity"],
    fitsMySchedule: true,
    dedupeKey: "activity:cleanup-central-green-2026-10-24",
    isDemoData: true,
    sourceLabel: "Help a Neighbour",
  },
];

export const MOCK_OPPORTUNITIES: Opportunity[] = MOCK_OPPORTUNITY_BASE.map((o) => ({
  ...o,
  urgency: urgencyFor(o.scheduledAt),
}));

const MOCK_CONTRIBUTIONS: Contribution[] = [
  {
    id: "con-1",
    title: "Grocery run for Pn. Siti",
    source: "request",
    minutes: 45,
    completedAt: "2026-10-11T10:30:00+08:00",
  },
  {
    id: "con-2",
    title: "Phone setup help",
    source: "request",
    minutes: 30,
    completedAt: "2026-10-08T17:00:00+08:00",
  },
  {
    id: "con-3",
    title: "Community garden tidy-up",
    source: "event",
    minutes: 90,
    completedAt: "2026-10-04T08:00:00+08:00",
  },
];

export const MOCK_IMPACT: ImpactSummary = {
  totalMinutes: MOCK_CONTRIBUTIONS.reduce((sum, c) => sum + c.minutes, 0),
  completedCount: MOCK_CONTRIBUTIONS.length,
  // Group tasks (e.g. the garden tidy-up) help several neighbours at once.
  peopleHelped: 5,
  items: MOCK_CONTRIBUTIONS,
  isDemoData: true,
};
