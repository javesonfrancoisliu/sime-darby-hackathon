import type {
  CheckInResult,
  LeaderboardResponse,
  PointsSummary,
  Streak,
  User,
} from "@sdh/contracts";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";
import { db, table } from "../../lib/db";
import { call } from "../../test/api";
import { createElder, createVerifiedVolunteerDirect } from "../../test/people";
import { useTestTable } from "../../test/table";
import { givePoints, optIn } from "./testSupport";
import { createUser } from "../users/service";
import { getUser } from "../users/repository";

useTestTable();

describe("points and streak", () => {
  it("requires sign-in and returns balances with a paged ledger", async () => {
    expect((await call("GET", "/api/me/points")).status).toBe(401);
    const elder = await createElder();
    await givePoints(elder.id, 30);
    await givePoints(elder.id, 20);
    const res = await call("GET", "/api/me/points", { as: elder.id, query: { limit: "1" } });
    const body = res.body as PointsSummary;
    expect(body).toMatchObject({ points: 50, lifetimePoints: 50 });
    expect(body.ledger.items).toHaveLength(1);
    expect(body.ledger.nextCursor).toBeDefined();
    const next = await call("GET", "/api/me/points", {
      as: elder.id,
      query: { limit: "1", cursor: body.ledger.nextCursor as string },
    });
    expect((next.body as PointsSummary).ledger.items).toHaveLength(1);
  });

  it("starts with an empty streak", async () => {
    const elder = await createElder();
    const res = await call("GET", "/api/me/streak", { as: elder.id });
    expect(res.body).toEqual({ current: 0, best: 0, recent: [] } satisfies Streak);
  });

  it("checks in once per day and refuses a second", async () => {
    const elder = await createElder();
    const first = await call("POST", "/api/me/check-in", { as: elder.id });
    expect(first.status).toBe(200);
    const body = first.body as CheckInResult;
    expect(body).toMatchObject({ pointsAwarded: 10, points: 10, streak: { current: 1, best: 1 } });
    expect(body.streak.recent).toHaveLength(1);

    const second = await call("POST", "/api/me/check-in", { as: elder.id });
    expect(second.status).toBe(409);
    expect(JSON.stringify(second.body)).toContain("ALREADY_DONE");
    expect((await getUser(elder.id))?.points).toBe(10);
    expect(((await call("GET", "/api/me/streak", { as: elder.id })).body as Streak).current).toBe(
      1,
    );
  });

  it("continues a streak from yesterday and resets one that lapsed", async () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const kl = (daysAgo: number) =>
      new Date(Date.now() + 8 * 60 * 60 * 1000 - daysAgo * dayMs).toISOString().slice(0, 10);
    const seed = (userId: string, last: string, current: number) =>
      db().send(
        new PutCommand({
          TableName: table(),
          Item: {
            PK: `USER#${userId}`,
            SK: "STREAK",
            entity: "STREAK",
            current,
            best: 5,
            lastCheckInDate: last,
            recent: [last],
          },
        }),
      );
    const kept = await createElder();
    await seed(kept.id, kl(1), 3);
    const next = (await call("POST", "/api/me/check-in", { as: kept.id })).body as CheckInResult;
    expect(next.streak).toMatchObject({ current: 4, best: 5 });
    expect(next.streak.recent).toEqual([kl(1), kl(0)]);

    const lapsed = await createElder();
    await seed(lapsed.id, kl(3), 3);
    expect(((await call("GET", "/api/me/streak", { as: lapsed.id })).body as Streak).current).toBe(
      0,
    );
    const reset = (await call("POST", "/api/me/check-in", { as: lapsed.id })).body as CheckInResult;
    expect(reset.streak).toMatchObject({ current: 1, best: 5 });
  });

  it("parallel check-ins award once", async () => {
    const volunteer = await createVerifiedVolunteerDirect();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => call("POST", "/api/me/check-in", { as: volunteer.id })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(true);
    expect((await getUser(volunteer.id))?.points).toBe(10);
  });

  it("coordinators cannot check in", async () => {
    const coordinator = await createUser({
      role: "coordinator",
      name: "Cora",
      area: "Elmina West",
      location: { lat: 3.07, lng: 101.5 },
      skills: [],
      experience: "",
      availability: [],
    });
    expect((await call("POST", "/api/me/check-in", { as: coordinator.id })).status).toBe(403);
  });
});

describe("leaderboard", () => {
  it("is for volunteers only", async () => {
    const elder = await createElder();
    expect((await call("GET", "/api/leaderboard", { as: elder.id })).status).toBe(403);
    expect((await call("GET", "/api/leaderboard")).status).toBe(401);
  });

  it("lists opted-in verified volunteers by lifetime points without leaking anything else", async () => {
    const top = await optIn(await createVerifiedVolunteerDirect({ name: "Aisha Rahman Lim" }));
    const mid = await optIn(await createVerifiedVolunteerDirect({ name: "Dev" }));
    const hidden = await createVerifiedVolunteerDirect({ name: "Hidden Person" });
    const pending = await optIn(await createVolunteerPending());
    await givePoints(top.id, 300);
    await givePoints(mid.id, 100);
    await givePoints(hidden.id, 900);
    await givePoints(pending.id, 900);

    const res = await call("GET", "/api/leaderboard", { as: mid.id });
    expect(res.status).toBe(200);
    const body = res.body as LeaderboardResponse;
    expect(body.entries.map((e) => e.displayName)).toEqual(["Aisha L.", "Dev"]);
    expect(body.entries.map((e) => e.rank)).toEqual([1, 2]);
    expect(body.me).toEqual({
      rank: 2,
      displayName: "Dev",
      lifetimePoints: 100,
      isCurrentUser: true,
    });
    const text = JSON.stringify(body);
    for (const leak of ["location", "lat", "availability", "Hidden", top.id, mid.id, "Rahman"]) {
      expect(text).not.toContain(leak);
    }
  });

  it("omits me for a volunteer who has not opted in", async () => {
    const out = await createVerifiedVolunteerDirect();
    const body = (await call("GET", "/api/leaderboard", { as: out.id }))
      .body as LeaderboardResponse;
    expect(body.me).toBeUndefined();
  });
});

async function createVolunteerPending(): Promise<User> {
  return createUser({
    role: "volunteer",
    name: "Pending Person",
    area: "Elmina West",
    location: { lat: 3.07, lng: 101.5 },
    skills: [],
    experience: "",
    availability: [],
  });
}
