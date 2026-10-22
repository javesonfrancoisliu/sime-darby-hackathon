import { describe, expect, it } from "vitest";
import { pickLocal } from "./useSafetyData";

const readings = [
  { area: "Central Park", value: 55 },
  { area: "Elmina Valley", value: 78 },
  { area: "Elmina West", value: 42 },
  { area: "City of Elmina", value: 34 },
];

describe("pickLocal", () => {
  it("matches a street-level resident area to the precinct reading", () => {
    const hit = pickLocal(readings, "Block A, Elmina West");
    expect(hit.item?.value).toBe(42);
    expect(hit.isLocal).toBe(true);
  });

  it("matches an exact precinct, ignoring case", () => {
    expect(pickLocal(readings, "elmina valley").item?.value).toBe(78);
  });

  it("flags the fallback reading as not local when no precinct matches", () => {
    const hit = pickLocal(readings, "Elmina East");
    expect(hit.item?.area).toBe("Central Park");
    expect(hit.isLocal).toBe(false);
  });

  it("returns nothing for an empty list", () => {
    expect(pickLocal([], "Elmina West")).toEqual({ item: undefined, isLocal: false });
  });
});
