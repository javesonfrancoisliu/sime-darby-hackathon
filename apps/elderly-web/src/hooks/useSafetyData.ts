import type { FacilityReport, SafetyReading } from "@sdh/contracts";
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

// The reading for the resident's area, or the first one when none matches.
export function pickLocal<T extends { area: string }>(items: T[], area?: string): T | undefined {
  return items.find((i) => i.area === area) ?? items[0];
}
