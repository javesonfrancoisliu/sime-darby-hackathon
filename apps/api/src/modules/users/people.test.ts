import { GetCommand } from "@aws-sdk/lib-dynamodb";
import {
  DEFAULT_SETTINGS,
  type HelpRequest,
  type MedicalId,
  type Settings,
  type User,
} from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { db, table } from "../../lib/db";
import { call, createUser, createVerifiedVolunteer } from "../../test/api";
import { useTestTable } from "../../test/table";

useTestTable();

const medical = {
  bloodGroup: "O+",
  nextOfKinName: "Aisyah Rahman",
  nextOfKinRelation: "Daughter",
  nextOfKinPhone: "012-345 6789",
};
const MEDICAL_FIELDS = ["bloodGroup", "nextOfKin"];

describe("medical ID", () => {
  let coordinator: User;
  let elder: User;
  let volunteer: User;

  beforeAll(async () => {
    coordinator = await createUser("coordinator");
    elder = await createUser("elder", { name: "Mak Som" });
    volunteer = await createVerifiedVolunteer(coordinator.id);
  });

  it("404s until saved, then round-trips, replaces and deletes", async () => {
    const none = await call("GET", "/api/me/medical-id", { as: elder.id });
    expect(none.status).toBe(404);

    const put = await call("PUT", "/api/me/medical-id", { as: elder.id, body: medical });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject(medical);
    expect((put.body as MedicalId).updatedAt).toBeDefined();

    const got = await call("GET", "/api/me/medical-id", { as: elder.id });
    expect(got.body).toEqual(put.body);

    const changed = { ...medical, bloodGroup: "AB-" };
    await call("PUT", "/api/me/medical-id", { as: elder.id, body: changed });
    expect((await call("GET", "/api/me/medical-id", { as: elder.id })).body).toMatchObject(changed);

    expect((await call("DELETE", "/api/me/medical-id", { as: elder.id })).status).toBe(204);
    expect((await call("GET", "/api/me/medical-id", { as: elder.id })).status).toBe(404);
    expect((await call("DELETE", "/api/me/medical-id", { as: elder.id })).status).toBe(204);
  });

  it("validates the body strictly", async () => {
    const bad = (body: unknown) => call("PUT", "/api/me/medical-id", { as: elder.id, body });
    expect((await bad({ ...medical, nextOfKinPhone: "abc" })).status).toBe(400);
    expect((await bad({ ...medical, bloodGroup: "Z" })).status).toBe(400);
    expect((await bad({ ...medical, extra: 1 })).status).toBe(400);
    expect((await bad({ ...medical, updatedAt: "2026-01-01T00:00:00Z" })).status).toBe(400);
  });

  it("is elder-only for every method", async () => {
    for (const user of [volunteer, coordinator]) {
      for (const method of ["GET", "PUT", "DELETE"]) {
        const res = await call(method, "/api/me/medical-id", {
          as: user.id,
          body: method === "PUT" ? medical : undefined,
        });
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ error: { code: "FORBIDDEN" } });
      }
    }
    expect((await call("GET", "/api/me/medical-id")).status).toBe(401);
  });

  it("is always the caller's own", async () => {
    const other = await createUser("elder");
    await call("PUT", "/api/me/medical-id", { as: elder.id, body: medical });
    expect((await call("GET", "/api/me/medical-id", { as: other.id })).status).toBe(404);
  });

  it("stores no GSI attributes", async () => {
    await call("PUT", "/api/me/medical-id", { as: elder.id, body: medical });
    const { Item } = await db().send(
      new GetCommand({ TableName: table(), Key: { PK: `USER#${elder.id}`, SK: "MEDICAL" } }),
    );
    expect(Item).toBeDefined();
    expect(Object.keys(Item ?? {}).filter((k) => k.startsWith("GSI"))).toEqual([]);
  });

  it("never leaks into profile, volunteer, request or event responses", async () => {
    await call("PUT", "/api/me/medical-id", { as: elder.id, body: medical });
    const create = await call("POST", "/api/requests", {
      as: elder.id,
      body: {
        category: "groceries",
        title: "Shopping",
        scheduledAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        durationMinutes: 60,
        location: { lat: 3.0738, lng: 101.5183, area: "Precinct 1" },
      },
    });
    const request = create.body as HelpRequest;
    const responses = [
      await call("GET", "/api/me", { as: elder.id }),
      await call("GET", "/api/me", { as: volunteer.id }),
      await call("GET", "/api/volunteers", { as: coordinator.id }),
      await call("GET", "/api/requests/mine", { as: elder.id }),
      await call("GET", `/api/requests/${request.id}`, { as: coordinator.id }),
      await call("GET", "/api/events"),
      await call("GET", "/api/me/settings", { as: elder.id }),
    ];
    for (const res of responses) {
      const text = JSON.stringify(res.body);
      for (const field of MEDICAL_FIELDS) expect(text).not.toContain(field);
      expect(text).not.toContain(medical.nextOfKinName);
    }
  });
});

describe("settings", () => {
  it("returns defaults, then a full replace", async () => {
    const volunteer = await createUser("volunteer");
    const first = await call("GET", "/api/me/settings", { as: volunteer.id });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject(DEFAULT_SETTINGS);

    const next = { ...DEFAULT_SETTINGS, fontSize: "xlarge", highContrast: true };
    const put = await call("PUT", "/api/me/settings", { as: volunteer.id, body: next });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject(next);
    expect((put.body as Settings).updatedAt).toBeDefined();
    expect((await call("GET", "/api/me/settings", { as: volunteer.id })).body).toEqual(put.body);
  });

  it("rejects partial, unknown and unsigned requests", async () => {
    const elder = await createUser("elder");
    const bad = (body: unknown) => call("PUT", "/api/me/settings", { as: elder.id, body });
    expect((await bad({ fontSize: "large" })).status).toBe(400);
    expect((await bad({ ...DEFAULT_SETTINGS, fontSize: "huge" })).status).toBe(400);
    expect((await bad({ ...DEFAULT_SETTINGS, extra: true })).status).toBe(400);
    expect((await call("GET", "/api/me/settings")).status).toBe(401);
  });

  it("keeps each person's settings separate", async () => {
    const a = await createUser("elder");
    const b = await createUser("elder");
    await call("PUT", "/api/me/settings", {
      as: a.id,
      body: { ...DEFAULT_SETTINGS, voiceAssist: true },
    });
    expect((await call("GET", "/api/me/settings", { as: b.id })).body).toMatchObject({
      voiceAssist: false,
    });
  });
});

describe("profile extras", () => {
  it("defaults, updates interests, languages and leaderboardOptIn", async () => {
    const volunteer = await createUser("volunteer");
    expect((await call("GET", "/api/me", { as: volunteer.id })).body).toMatchObject({
      interests: [],
      languages: [],
      leaderboardOptIn: false,
      points: 0,
      lifetimePoints: 0,
    });
    const patch = await call("PATCH", "/api/me", {
      as: volunteer.id,
      body: { interests: ["groceries"], languages: ["en", "ms"], leaderboardOptIn: true },
    });
    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({
      interests: ["groceries"],
      languages: ["en", "ms"],
      leaderboardOptIn: true,
    });
    expect((await call("GET", "/api/me", { as: volunteer.id })).body).toMatchObject({
      leaderboardOptIn: true,
    });
  });

  it("never accepts points or lifetimePoints", async () => {
    const volunteer = await createUser("volunteer");
    for (const field of ["points", "lifetimePoints"]) {
      const res = await call("PATCH", "/api/me", { as: volunteer.id, body: { [field]: 9999 } });
      expect(res.status).toBe(400);
    }
    const mixed = await call("PATCH", "/api/me", {
      as: volunteer.id,
      body: { name: "New Name", points: 5 },
    });
    expect(mixed.status).toBe(400);
    expect((await call("GET", "/api/me", { as: volunteer.id })).body).toMatchObject({
      name: "Test volunteer",
      points: 0,
      lifetimePoints: 0,
    });
  });
});
