import { describe, expect, it } from "vitest";
import { approxKm, approxPlace, distanceKm, roundKm } from "./geo";

describe("distanceKm", () => {
  it("is zero for the same point and symmetric", () => {
    const a = { lat: 3.0738, lng: 101.5183 };
    const b = { lat: 3.139, lng: 101.6869 };
    expect(distanceKm(a, a)).toBe(0);
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9);
  });

  it("matches a known distance within 1%", () => {
    // Shah Alam to Kuala Lumpur city centre, roughly 20 km apart.
    const km = distanceKm({ lat: 3.0738, lng: 101.5183 }, { lat: 3.139, lng: 101.6869 });
    expect(km).toBeGreaterThan(19.5);
    expect(km).toBeLessThan(20.5);
  });

  it("approximates to 0.5 km steps and never below 0.5 km", () => {
    expect(approxKm(0)).toBe(0.5);
    expect(approxKm(1.1)).toBe(1);
    expect(approxKm(1.3)).toBe(1.5);
    expect(approxKm(4.74)).toBe(4.5);
  });

  it("rounds to one decimal place", () => {
    expect(roundKm(1.26)).toBe(1.3);
    expect(roundKm(0.04)).toBe(0);
  });
});

describe("approxPlace", () => {
  it("snaps to a 0.5 km grid, keeps the area and stays within 0.5 km", () => {
    const place = { lat: 3.0738, lng: 101.5183, area: "Precinct 1" };
    const snapped = approxPlace(place);
    expect(snapped.area).toBe("Precinct 1");
    expect(snapped).not.toEqual(place);
    expect(distanceKm(place, snapped)).toBeLessThan(0.5);
  });

  it("gives the same point for places in the same cell and is idempotent", () => {
    const a = approxPlace({ lat: 3.0738, lng: 101.5183 });
    const b = approxPlace({ lat: 3.07381, lng: 101.51831 });
    expect(a).toEqual(b);
    expect(approxPlace(a)).toEqual(a);
  });
});
