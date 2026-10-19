import type { Badge, BadgesResponse, User } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call } from "../../test/api";
import { createCoordinator, createElder, createVerifiedVolunteerDirect } from "../../test/people";
import { useTestTable } from "../../test/table";
import { createChallengeVia, givePoints } from "../play/testSupport";

useTestTable();

describe("badges", () => {
  let coordinator: User;
  beforeAll(async () => {
    coordinator = await createCoordinator();
  });

  async function createBadge(body: Record<string, unknown>): Promise<Badge> {
    const res = await call("POST", "/api/badges", {
      as: coordinator.id,
      body: { title: "Badge", icon: "medal", ...body },
    });
    if (res.status !== 201) throw new Error(JSON.stringify(res.body));
    return res.body as Badge;
  }

  const list = async (userId: string) =>
    ((await call("GET", "/api/badges", { as: userId })).body as BadgesResponse).badges;

  it("restricts create to the coordinator and list to signed-in users", async () => {
    const elder = await createElder();
    const res = await call("POST", "/api/badges", {
      as: elder.id,
      body: { title: "x", icon: "star", kind: "points", threshold: 1 },
    });
    expect(res.status).toBe(403);
    expect((await call("GET", "/api/badges")).status).toBe(401);
  });

  it("filters by audience", async () => {
    const elder = await createElder();
    const forVolunteers = await createBadge({
      kind: "points",
      threshold: 5,
      audience: "volunteer",
    });
    const forAll = await createBadge({ kind: "points", threshold: 5 });
    const ids = (await list(elder.id)).map((b) => b.id);
    expect(ids).toContain(forAll.id);
    expect(ids).not.toContain(forVolunteers.id);
  });

  it("derives points badges from lifetime points", async () => {
    const volunteer = await createVerifiedVolunteerDirect();
    const badge = await createBadge({ kind: "points", threshold: 50 });
    const earned = async () => (await list(volunteer.id)).find((b) => b.id === badge.id)?.earned;
    expect(await earned()).toBe(false);
    await givePoints(volunteer.id, 50);
    expect(await earned()).toBe(true);
  });

  it("derives challenge badges from completed challenges", async () => {
    const volunteer = await createVerifiedVolunteerDirect();
    const badge = await createBadge({ kind: "challenges", threshold: 1 });
    const earned = async () => (await list(volunteer.id)).find((b) => b.id === badge.id)?.earned;
    expect(await earned()).toBe(false);
    const challenge = await createChallengeVia(coordinator.id, {
      goal: { target: 1, unit: "x", type: "count" },
    });
    await call("POST", `/api/challenges/${challenge.id}/join`, { as: volunteer.id });
    await call("PUT", `/api/challenges/${challenge.id}/progress`, {
      as: volunteer.id,
      body: { current: 1 },
    });
    expect(await earned()).toBe(false);
    await call("POST", `/api/challenges/${challenge.id}/complete`, { as: volunteer.id });
    expect(await earned()).toBe(true);
  });
});
