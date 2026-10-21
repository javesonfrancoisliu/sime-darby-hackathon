import { randomUUID } from "node:crypto";
import type { FacilityReport, SafetyResponse } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call } from "../../test/api";
import { createCoordinator, createElder, createVerifiedVolunteerDirect } from "../../test/people";
import { useTestTable } from "../../test/table";

useTestTable();

const air = (overrides: Record<string, unknown> = {}) => ({
  type: "air",
  level: "good",
  area: "Precinct 1",
  value: 40,
  unit: "AQI",
  advice: "Enjoy outdoors",
  measuredAt: "2026-10-19T08:00:00+08:00",
  ...overrides,
});

const water = (overrides: Record<string, unknown> = {}) => ({
  type: "water",
  level: "normal",
  area: "Precinct 1",
  name: "Lake A",
  waterBody: "lake",
  normalMax: 2,
  value: 1,
  unit: "m",
  advice: "Normal",
  measuredAt: "2026-10-19T08:00:00+08:00",
  ...overrides,
});

const heat = (overrides: Record<string, unknown> = {}) => ({
  type: "heat",
  level: "warning",
  area: "Precinct 1",
  feelsLike: 38,
  humidity: 80,
  value: 34,
  unit: "C",
  advice: "Drink water",
  measuredAt: "2026-10-19T08:00:00+08:00",
  ...overrides,
});

describe("safety", () => {
  let coordinatorId: string;
  let elderId: string;

  beforeAll(async () => {
    coordinatorId = (await createCoordinator()).id;
    elderId = (await createElder()).id;
  });

  const put = (body: unknown, as: string = coordinatorId) =>
    call("PUT", "/api/safety/readings", { as, body });
  const load = async () => {
    const res = await call("GET", "/api/safety", { as: elderId });
    expect(res.status).toBe(200);
    return res.body as SafetyResponse;
  };

  it("restricts writes to coordinators and reads to signed-in users", async () => {
    const volunteer = await createVerifiedVolunteerDirect();
    for (const as of [elderId, volunteer.id]) {
      expect((await put(air(), as)).status).toBe(403);
      expect(
        (
          await call("POST", "/api/facility-reports", {
            as,
            body: { title: "t", area: "a", category: "c" },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await call("PATCH", `/api/facility-reports/${randomUUID()}`, {
            as,
            body: { status: "resolved" },
          })
        ).status,
      ).toBe(403);
    }
    expect((await call("GET", "/api/safety")).status).toBe(401);
    expect((await call("PUT", "/api/safety/readings", { body: air() })).status).toBe(401);
    expect((await call("GET", "/api/safety", { as: volunteer.id })).status).toBe(200);
  });

  it("validates readings", async () => {
    expect((await put(air({ level: "great" }))).status).toBe(400);
    expect((await put(water({ name: undefined }))).status).toBe(400);
    expect((await put(heat({ humidity: 120 }))).status).toBe(400);
    expect((await put({ ...air(), type: "noise" })).status).toBe(400);
  });

  it("rejects unbounded, negative and denormal numbers with 400 instead of a 500", async () => {
    const cases = [
      air({ value: 1e21 }),
      air({ value: 1e16 }),
      air({ value: 5e-324 }),
      air({ value: -50 }),
      air({ value: 100_001 }),
      water({ normalMax: 1e21 }),
      water({ value: -1 }),
      heat({ feelsLike: 1e21 }),
      heat({ feelsLike: -61 }),
      heat({ humidity: 5e-324 }),
    ];
    for (const body of cases) {
      const res = await put(body);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    }
    expect((await put(air({ area: "Edge Area", value: 100_000 }))).status).toBe(200);
    expect((await put(air({ area: "Edge Area", value: 0 }))).status).toBe(200);
    expect((await put(heat({ feelsLike: -60 }))).status).toBe(200);
  });

  it("allows a measuredAt up to a day ahead and rejects anything later", async () => {
    const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();
    expect((await put(air({ measuredAt: ahead(23 * 3_600_000) }))).status).toBe(200);
    const far = await put(air({ measuredAt: "2999-01-01T00:00:00Z" }));
    expect(far.status).toBe(400);
    expect(JSON.stringify(far.body)).toContain("measuredAt");
    expect((await put(air({ measuredAt: ahead(25 * 3_600_000) }))).status).toBe(400);
  });

  it("upserts one reading per type and area and normalises times to UTC", async () => {
    await put(air({ area: "Zone Upsert", value: 40 }));
    await put(air({ area: "Zone Upsert", value: 55, level: "moderate" }));
    await put(air({ area: "zone upsert ", value: 60, level: "moderate" }));
    const readings = (await load()).readings.filter(
      (r) => r.type === "air" && r.area.toLowerCase().trim() === "zone upsert",
    );
    expect(readings).toHaveLength(1);
    expect(readings[0]).toMatchObject({ value: 60, measuredAt: "2026-10-19T00:00:00.000Z" });
  });

  it("keeps water readings unique per area and name and is idempotent", async () => {
    const body = water({ area: "Zone W", name: "Lake A" });
    const first = await put(body);
    const second = await put(body);
    expect(first.status).toBe(200);
    expect(second.body).toEqual(first.body);
    await put(water({ area: "Zone W", name: "Lake B", level: "watch" }));
    await put(water({ area: "Zone W", name: "Lake A", value: 3, level: "warning" }));
    const waters = (await load()).readings.filter((r) => r.type === "water" && r.area === "Zone W");
    expect(waters).toHaveLength(2);
    expect(waters.find((r) => r.type === "water" && r.name === "Lake A")).toMatchObject({
      value: 3,
      level: "warning",
    });
  });

  it("returns readings field by field with no storage keys", async () => {
    await put(heat({ area: "Zone H" }));
    const reading = (await load()).readings.find((r) => r.type === "heat" && r.area === "Zone H");
    expect(Object.keys(reading ?? {}).sort()).toEqual(
      [
        "advice",
        "area",
        "feelsLike",
        "humidity",
        "level",
        "measuredAt",
        "type",
        "unit",
        "value",
      ].sort(),
    );
  });

  it("creates facility reports as reported and updates them, newest updated first", async () => {
    const create = async (title: string) => {
      const res = await call("POST", "/api/facility-reports", {
        as: coordinatorId,
        body: { title, area: "Precinct 1", category: "lighting" },
      });
      expect(res.status).toBe(201);
      return res.body as FacilityReport;
    };
    const a = await create("Lamp A");
    await new Promise((r) => setTimeout(r, 5));
    const b = await create("Lamp B");
    expect(a).toMatchObject({ status: "reported", description: "" });

    let ids = (await load()).facilityReports.map((f) => f.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));

    await new Promise((r) => setTimeout(r, 5));
    const patched = await call("PATCH", `/api/facility-reports/${a.id}`, {
      as: coordinatorId,
      body: { status: "resolved" },
    });
    expect(patched.status).toBe(200);
    const body = patched.body as FacilityReport;
    expect(body.status).toBe("resolved");
    expect(body.updatedAt > a.updatedAt).toBe(true);
    expect(body.reportedAt).toBe(a.reportedAt);
    // Status moves freely, including back.
    const back = await call("PATCH", `/api/facility-reports/${a.id}`, {
      as: coordinatorId,
      body: { status: "reported" },
    });
    expect(back.status).toBe(200);
    ids = (await load()).facilityReports.map((f) => f.id);
    expect(ids.indexOf(a.id)).toBeLessThan(ids.indexOf(b.id));
  });

  it("validates facility reports and returns 404 for an unknown one", async () => {
    const post = (body: unknown) =>
      call("POST", "/api/facility-reports", { as: coordinatorId, body });
    expect((await post({ title: "", area: "a", category: "c" })).status).toBe(400);
    expect((await post({ title: "t", area: "a", category: "c", status: "resolved" })).status).toBe(
      400,
    );
    const patch = (id: string, body: unknown) =>
      call("PATCH", `/api/facility-reports/${id}`, { as: coordinatorId, body });
    expect((await patch("nope", { status: "resolved" })).status).toBe(400);
    expect((await patch(randomUUID(), { status: "fixed" })).status).toBe(400);
    expect((await patch(randomUUID(), {})).status).toBe(400);
    expect((await patch(randomUUID(), { status: "resolved" })).status).toBe(404);
  });
});
