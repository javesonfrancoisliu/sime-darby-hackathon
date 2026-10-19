import type {
  Challenge,
  ChallengeActionResult,
  ChallengesResponse,
  ContributeResult,
  PendingVerificationsResponse,
  User,
} from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call } from "../../test/api";
import { createCoordinator, createElder, createVerifiedVolunteerDirect } from "../../test/people";
import { useTestTable } from "../../test/table";
import { createChallengeVia, putEndedChallenge } from "../play/testSupport";
import { getUser } from "../users/repository";

useTestTable();

describe("challenges", () => {
  let coordinator: User;
  beforeAll(async () => {
    coordinator = await createCoordinator();
  });

  const list = async (userId: string) =>
    ((await call("GET", "/api/challenges", { as: userId })).body as ChallengesResponse).challenges;

  it("only a coordinator creates, and a past end date is rejected", async () => {
    const elder = await createElder();
    const forbidden = await call("POST", "/api/challenges", {
      as: elder.id,
      body: { title: "x" },
    });
    expect(forbidden.status).toBe(403);
    expect((await call("POST", "/api/challenges")).status).toBe(401);
    const past = await call("POST", "/api/challenges", {
      as: coordinator.id,
      body: {
        title: "Late",
        icon: "walk",
        category: "fitness",
        mode: "individual",
        goal: { target: 1, unit: "x", type: "count" },
        endsOn: "2020-01-01T00:00:00+08:00",
      },
    });
    expect(past.status).toBe(400);
    const created = await createChallengeVia(coordinator.id, {
      endsOn: "2099-01-01T08:00:00+08:00",
    });
    expect(created.endsOn).toBe("2099-01-01T00:00:00.000Z");
  });

  it("filters by audience; the coordinator sees everything", async () => {
    const elder = await createElder();
    const volunteer = await createVerifiedVolunteerDirect();
    const all = await createChallengeVia(coordinator.id, { audience: "all" });
    const forElders = await createChallengeVia(coordinator.id, { audience: "elder" });
    const forVolunteers = await createChallengeVia(coordinator.id, { audience: "volunteer" });
    const ids = (cs: Challenge[]) => cs.map((c) => c.id);

    const elderIds = ids(await list(elder.id));
    expect(elderIds).toEqual(expect.arrayContaining([all.id, forElders.id]));
    expect(elderIds).not.toContain(forVolunteers.id);
    const volunteerIds = ids(await list(volunteer.id));
    expect(volunteerIds).toContain(forVolunteers.id);
    expect(volunteerIds).not.toContain(forElders.id);
    expect(ids(await list(coordinator.id))).toEqual(
      expect.arrayContaining([all.id, forElders.id, forVolunteers.id]),
    );
    expect((await call("GET", "/api/challenges")).status).toBe(401);

    const denied = await call("POST", `/api/challenges/${forVolunteers.id}/join`, { as: elder.id });
    expect(denied.status).toBe(403);
  });

  it("derives ended from endsOn and rejects progress and contribute", async () => {
    const elder = await createElder();
    const ended = await putEndedChallenge(coordinator.id);
    const endedTeam = await putEndedChallenge(coordinator.id, { mode: "team" });
    expect((await list(elder.id)).find((c) => c.id === ended.id)?.ended).toBe(true);
    for (const path of [`/${ended.id}/join`, `/${endedTeam.id}/contribute`]) {
      const res = await call("POST", `/api/challenges${path}`, { as: elder.id });
      expect(res.status).toBe(409);
    }
    const progress = await call("PUT", `/api/challenges/${ended.id}/progress`, {
      as: elder.id,
      body: { current: 1 },
    });
    expect(progress.status).toBe(409);
  });

  it("joins idempotently, clamps progress and completes once with points", async () => {
    const elder = await createElder();
    const challenge = await createChallengeVia(coordinator.id, {
      goal: { target: 10, unit: "sessions", type: "sessions" },
      points: 40,
    });
    const first = await call("POST", `/api/challenges/${challenge.id}/join`, { as: elder.id });
    const second = await call("POST", `/api/challenges/${challenge.id}/join`, { as: elder.id });
    expect(first.status).toBe(200);
    expect((second.body as ChallengeActionResult).progress.joinedAt).toBe(
      (first.body as ChallengeActionResult).progress.joinedAt,
    );

    const early = await call("POST", `/api/challenges/${challenge.id}/complete`, { as: elder.id });
    expect(early.status).toBe(400);

    const over = await call("PUT", `/api/challenges/${challenge.id}/progress`, {
      as: elder.id,
      body: { current: 999 },
    });
    expect((over.body as ChallengeActionResult).progress.current).toBe(10);

    const done = await call("POST", `/api/challenges/${challenge.id}/complete`, { as: elder.id });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ progress: { status: "completed" }, pointsAwarded: 40 });
    expect((await getUser(elder.id))?.points).toBe(40);

    const again = await call("POST", `/api/challenges/${challenge.id}/complete`, { as: elder.id });
    expect(again.status).toBe(409);
    expect(JSON.stringify(again.body)).toContain("ALREADY_DONE");
    const after = await call("PUT", `/api/challenges/${challenge.id}/progress`, {
      as: elder.id,
      body: { current: 1 },
    });
    expect(after.status).toBe(409);
    expect((await getUser(elder.id))?.points).toBe(40);

    const mine = (await list(elder.id)).find((c) => c.id === challenge.id);
    expect(mine?.progress?.status).toBe("completed");
  });

  it("progress needs a join, and individual routes refuse a team challenge", async () => {
    const elder = await createElder();
    const solo = await createChallengeVia(coordinator.id);
    const unjoined = await call("PUT", `/api/challenges/${solo.id}/progress`, {
      as: elder.id,
      body: { current: 1 },
    });
    expect(unjoined.status).toBe(404);
    const team = await createChallengeVia(coordinator.id, { mode: "team" });
    expect((await call("POST", `/api/challenges/${team.id}/join`, { as: elder.id })).status).toBe(
      400,
    );
    expect(
      (await call("POST", `/api/challenges/${solo.id}/contribute`, { as: elder.id })).status,
    ).toBe(400);
  });

  it("allows one team contribution per KL day, counted per precinct", async () => {
    const west = await createElder({ area: "Elmina West" });
    const west2 = await createVerifiedVolunteerDirect({ area: "Elmina West" });
    const east = await createElder({ area: "Elmina East" });
    const team = await createChallengeVia(coordinator.id, {
      mode: "team",
      goal: { target: 100, unit: "contributions", type: "count" },
    });
    const first = await call("POST", `/api/challenges/${team.id}/contribute`, { as: west.id });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      teamProgress: { precinct: "Elmina West", current: 1 },
      pointsAwarded: 5,
    } satisfies Partial<ContributeResult>);
    const dup = await call("POST", `/api/challenges/${team.id}/contribute`, { as: west.id });
    expect(dup.status).toBe(409);
    expect(JSON.stringify(dup.body)).toContain("ALREADY_DONE");
    expect((await getUser(west.id))?.points).toBe(5);

    await call("POST", `/api/challenges/${team.id}/contribute`, { as: west2.id });
    const eastRes = await call("POST", `/api/challenges/${team.id}/contribute`, { as: east.id });
    expect((eastRes.body as ContributeResult).teamProgress).toEqual({
      precinct: "Elmina East",
      current: 1,
    });
    const view = (await list(west.id)).find((c) => c.id === team.id);
    expect(view?.teamProgress).toEqual({ precinct: "Elmina West", current: 2 });
  });

  it("finds the precinct inside a longer area and explains when there is none", async () => {
    const block = await createElder({ area: "Block C, Elmina West" });
    const team = await createChallengeVia(coordinator.id, {
      mode: "team",
      goal: { target: 100, unit: "contributions", type: "count" },
    });
    const ok = await call("POST", `/api/challenges/${team.id}/contribute`, { as: block.id });
    expect(ok.status).toBe(200);
    expect((ok.body as ContributeResult).teamProgress.precinct).toBe("Elmina West");

    const city = await createElder({ area: "City of Elmina" });
    const no = await call("POST", `/api/challenges/${team.id}/contribute`, { as: city.id });
    expect(no.status).toBe(400);
    expect(JSON.stringify(no.body)).toContain("precinct");
  });

  it("parallel contributions from one person count once", async () => {
    const elder = await createElder();
    const team = await createChallengeVia(coordinator.id, {
      mode: "team",
      goal: { target: 100, unit: "contributions", type: "count" },
    });
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        call("POST", `/api/challenges/${team.id}/contribute`, { as: elder.id }),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await getUser(elder.id))?.points).toBe(5);
  });

  it("holds a verified challenge until a coordinator verifies it", async () => {
    const elder = await createElder({ name: "Siti Aminah Binti Ali" });
    const challenge = await createChallengeVia(coordinator.id, {
      goal: { target: 3, unit: "sessions", type: "sessions" },
      points: 30,
      requiresVerification: true,
    });
    await call("POST", `/api/challenges/${challenge.id}/join`, { as: elder.id });
    await call("PUT", `/api/challenges/${challenge.id}/progress`, {
      as: elder.id,
      body: { current: 3 },
    });
    const requested = await call("POST", `/api/challenges/${challenge.id}/complete`, {
      as: elder.id,
    });
    expect(requested.body).toMatchObject({
      progress: { status: "pending_verification" },
      pointsAwarded: 0,
    });
    expect((await getUser(elder.id))?.points).toBe(0);

    expect(
      (await call("GET", `/api/challenges/${challenge.id}/pending`, { as: elder.id })).status,
    ).toBe(403);
    const pending = await call("GET", `/api/challenges/${challenge.id}/pending`, {
      as: coordinator.id,
    });
    expect((pending.body as PendingVerificationsResponse).pending).toEqual([
      expect.objectContaining({ userId: elder.id, displayName: "Siti A.", current: 3 }),
    ]);

    const denied = await call("POST", `/api/challenges/${challenge.id}/verify/${elder.id}`, {
      as: elder.id,
    });
    expect(denied.status).toBe(403);
    const verified = await call("POST", `/api/challenges/${challenge.id}/verify/${elder.id}`, {
      as: coordinator.id,
    });
    expect(verified.body).toMatchObject({
      progress: { status: "completed" },
      pointsAwarded: 30,
    });
    expect((await getUser(elder.id))?.points).toBe(30);

    const queue = await call("GET", `/api/challenges/${challenge.id}/pending`, {
      as: coordinator.id,
    });
    expect((queue.body as PendingVerificationsResponse).pending).toEqual([]);
    const twice = await call("POST", `/api/challenges/${challenge.id}/verify/${elder.id}`, {
      as: coordinator.id,
    });
    expect(twice.status).toBe(409);
    expect((await getUser(elder.id))?.points).toBe(30);
  });
});
