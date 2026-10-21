import type { Location } from "@sdh/contracts";

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Great-circle (haversine) distance; accurate enough at township scale.
export function distanceKm(a: Location, b: Location): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export const roundKm = (km: number): number => Math.round(km * 10) / 10;

// Distance shown about another person's home: coarse steps so repeated queries cannot pinpoint it.
const APPROX_STEP_KM = 0.5;
export const approxKm = (km: number): number =>
  Math.max(APPROX_STEP_KM, Math.round(km / APPROX_STEP_KM) * APPROX_STEP_KM);

const KM_PER_DEGREE_LAT = (EARTH_RADIUS_KM * Math.PI) / 180;
const COORDINATE_DECIMALS = 5;
const roundTo = (value: number, decimals: number) => Number(value.toFixed(decimals));

// Snaps a place to the same 0.5 km grid as approxKm, so shared coordinates cannot pinpoint a home.
export function approxPlace<T extends Location>(place: T): T {
  const latStep = APPROX_STEP_KM / KM_PER_DEGREE_LAT;
  const lat = Math.round(place.lat / latStep) * latStep;
  const lngStep = APPROX_STEP_KM / (KM_PER_DEGREE_LAT * Math.cos(toRadians(lat)));
  const lng = Math.round(place.lng / lngStep) * lngStep;
  return {
    ...place,
    lat: roundTo(lat, COORDINATE_DECIMALS),
    lng: roundTo(lng, COORDINATE_DECIMALS),
  };
}
