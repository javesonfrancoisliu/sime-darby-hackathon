import type { RedeemResult, Reward, RewardsResponse, User } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call } from "../../test/api";
import { createCoordinator, createElder, createVerifiedVolunteerDirect } from "../../test/people";
import { useTestTable } from "../../test/table";
import { giveContributions, givePoints } from "../play/testSupport";
import { getUser } from "../users/repository";

useTestTable();

describe("rewards", () => {
  let coordinator: User;
  beforeAll(async () => {
    coordinator = await createCoordinator();
  });

  async function createReward(overrides: Record<string, unknown> = {}): Promise<Reward> {
    const res = await call("POST", "/api/rewards", {
      as: coordinator.id,
      body: {
        title: "Kopi voucher",
        pointsCost: 40,
        icon: "coffee",
        category: "food",
        ...overrides,
      },
    });
    if (res.status !== 201) throw new Error(JSON.stringify(res.body));
    return res.body as Reward;
  }

  const list = async (userId: string) =>
    ((await call("GET", "/api/rewards", { as: userId })).body as RewardsResponse).rewards;

  it("only a coordinator creates rewards", async () => {
    const elder = await createElder();
    const res = await call("POST", "/api/rewards", {
      as: elder.id,
      body: { title: "x", pointsCost: 1, icon: "gift", category: "shop" },
    });
    expect(res.status).toBe(403);
    expect((await call("GET", "/api/rewards")).status).toBe(401);
  });

  it("filters by audience and hides inactive rewards from non-coordinators", async () => {
    const elder = await createElder();
    const forVolunteers = await createReward({ audience: "volunteer" });
    const inactive = await createReward({ active: false });
    const open = await createReward();
    const ids = (await list(elder.id)).map((r) => r.id);
    expect(ids).toContain(open.id);
    expect(ids).not.toContain(forVolunteers.id);
    expect(ids).not.toContain(inactive.id);
    const all = (await list(coordinator.id)).map((r) => r.id);
    expect(all).toEqual(expect.arrayContaining([forVolunteers.id, inactive.id, open.id]));
    const denied = await call("POST", `/api/rewards/${forVolunteers.id}/redeem`, { as: elder.id });
    expect(denied.status).toBe(404);
  });

  it("reports locked, available and redeemed and deducts points", async () => {
    const elder = await createElder();
    const reward = await createReward();
    const status = async () => (await list(elder.id)).find((r) => r.id === reward.id);
    expect((await status())?.status).toBe("locked");

    const poor = await call("POST", `/api/rewards/${reward.id}/redeem`, { as: elder.id });
    expect(poor.status).toBe(409);
    expect(JSON.stringify(poor.body)).toContain("INSUFFICIENT_POINTS");

    await givePoints(elder.id, 100);
    expect((await status())?.status).toBe("available");
    const done = await call("POST", `/api/rewards/${reward.id}/redeem`, { as: elder.id });
    expect(done.status).toBe(200);
    expect((done.body as RedeemResult).points).toBe(60);
    expect(await status()).toMatchObject({ status: "redeemed" });
    expect((await status())?.redeemedAt).toBeDefined();

    const again = await call("POST", `/api/rewards/${reward.id}/redeem`, { as: elder.id });
    expect(JSON.stringify(again.body)).toContain("ALREADY_DONE");
    expect((await getUser(elder.id))?.points).toBe(60);
  });

  it("locks a reward until enough volunteer tasks are done", async () => {
    const volunteer = await createVerifiedVolunteerDirect();
    await givePoints(volunteer.id, 100);
    const reward = await createReward({ minVolunteerTasks: 2 });
    expect((await list(volunteer.id)).find((r) => r.id === reward.id)?.status).toBe("locked");
    const early = await call("POST", `/api/rewards/${reward.id}/redeem`, { as: volunteer.id });
    expect(early.status).toBe(403);
    expect((await getUser(volunteer.id))?.points).toBe(100);

    await giveContributions(volunteer.id, 2);
    expect((await list(volunteer.id)).find((r) => r.id === reward.id)?.status).toBe("available");
    const ok = await call("POST", `/api/rewards/${reward.id}/redeem`, { as: volunteer.id });
    expect(ok.status).toBe(200);
  });

  it("two parallel redeems with one affordable spend once", async () => {
    const elder = await createElder();
    await givePoints(elder.id, 50);
    const [a, b] = await Promise.all([createReward(), createReward()]);
    const results = await Promise.all([
      call("POST", `/api/rewards/${a.id}/redeem`, { as: elder.id }),
      call("POST", `/api/rewards/${b.id}/redeem`, { as: elder.id }),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(1);
    expect((await getUser(elder.id))?.points).toBe(10);
  });

  it("an inactive reward cannot be redeemed", async () => {
    const elder = await createElder();
    await givePoints(elder.id, 100);
    const reward = await createReward({ active: false });
    const res = await call("POST", `/api/rewards/${reward.id}/redeem`, { as: elder.id });
    expect(res.status).toBe(404);
  });
});
