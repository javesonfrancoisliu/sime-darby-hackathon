import { describe, expect, it } from "vitest";
import { CreateMeBody, CreateUserBody, PRECINCT_LOCATIONS, Precinct, UpdateMeBody } from "./index";

const base = {
  role: "volunteer",
  name: "Aina",
  area: "Precinct 3",
  location: { lat: 3.1, lng: 101.5 },
};

describe("CreateUserBody", () => {
  it("fills defaults for optional profile fields", () => {
    const parsed = CreateUserBody.parse(base);
    expect(parsed).toMatchObject({ skills: [], experience: "", availability: [] });
  });

  it("rejects an availability slot that ends before it starts", () => {
    const result = CreateUserBody.safeParse({
      ...base,
      availability: [{ day: "sat", start: "12:00", end: "09:00" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown skill and a bad time format", () => {
    expect(CreateUserBody.safeParse({ ...base, skills: ["juggling"] }).success).toBe(false);
    expect(
      CreateUserBody.safeParse({
        ...base,
        availability: [{ day: "sat", start: "9am", end: "12:00" }],
      }).success,
    ).toBe(false);
  });
});

describe("UpdateMeBody", () => {
  it("rejects an empty update and unknown fields such as role", () => {
    expect(UpdateMeBody.safeParse({}).success).toBe(false);
    expect(UpdateMeBody.safeParse({ role: "coordinator" }).success).toBe(false);
  });

  it("does not inject defaults into a partial update", () => {
    expect(UpdateMeBody.parse({ name: "New" })).toEqual({ name: "New" });
  });
});

describe("CreateMeBody", () => {
  const me = { role: "elder", name: "Auntie Mary", precinct: "Elmina West" };

  it("accepts a self-chosen role, a name and a known precinct", () => {
    expect(CreateMeBody.parse(me)).toEqual(me);
  });

  it("rejects the coordinator role, an unknown precinct and extra fields such as id", () => {
    expect(CreateMeBody.safeParse({ ...me, role: "coordinator" }).success).toBe(false);
    expect(CreateMeBody.safeParse({ ...me, precinct: "Bandar Serai" }).success).toBe(false);
    expect(CreateMeBody.safeParse({ ...me, id: "x" }).success).toBe(false);
  });
});

describe("PRECINCT_LOCATIONS", () => {
  it("has a location for every precinct", () => {
    expect(Object.keys(PRECINCT_LOCATIONS).sort()).toEqual([...Precinct.options].sort());
  });
});
