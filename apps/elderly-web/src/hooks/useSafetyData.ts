import { Precinct, type FacilityReport, type SafetyReading } from "@sdh/contracts";
import { safetyApi } from "../api/safety";
import { useLiveQuery } from "./useLiveQuery";

const SAFETY_REFRESH_MS = 60_000;

// Readings and facility reports from the township, grouped by kind.
export function useSafetyData() {
  const query = useLiveQuery("safety", safetyApi.get, SAFETY_REFRESH_MS);
  const readings: SafetyReading[] = query.data?.readings ?? [];
  return {
    status: query.status,
    error: query.error,
    refetch: query.refetch,
    loaded: query.data !== undefined,
    air: readings.filter((r): r is AirReading => r.type === "air"),
    water: readings.filter((r): r is WaterReading => r.type === "water"),
    heat: readings.filter((r): r is HeatReading => r.type === "heat"),
    facilities: query.data?.facilityReports ?? [],
  };
}

export type AirReading = Extract<SafetyReading, { type: "air" }>;
export type WaterReading = Extract<SafetyReading, { type: "water" }>;
export type HeatReading = Extract<SafetyReading, { type: "heat" }>;
export type { FacilityReport };

// Resident areas carry a street or block ("Block A, Elmina West"); feeds name the precinct only.
const norm = (value: string) => value.trim().toLowerCase();
function precinctOf(area: string): string | undefined {
  const text = norm(area);
  return Precinct.options.find((name) => text.includes(norm(name)));
}

// True when a feed area is the resident's own area, or the precinct named inside it.
export function inResidentArea(feedArea: string, residentArea?: string): boolean {
  if (!residentArea) return false;
  if (norm(feedArea) === norm(residentArea)) return true;
  const precinct = precinctOf(residentArea);
  return precinct !== undefined && norm(feedArea) === norm(precinct);
}

// The reading for the resident's area. When none matches, the first reading is a nearest one.
export function pickLocal<T extends { area: string }>(
  items: T[],
  area?: string,
): { item: T | undefined; isLocal: boolean } {
  const match = items.find((i) => inResidentArea(i.area, area));
  if (match) return { item: match, isLocal: true };
  return { item: items[0], isLocal: false };
}
