import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db, table } from "../../lib/db";
import type { RedeemResult, Redemption, Reward, RewardsResponse, User } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call } from "../../test/api";
import { createCoordinator, createElder, createVerifiedVolunteerDirect } from "../../test/people";
import { useTestTable } from "../../test/table";
import { giveContributions, givePoints } from "../play/testSupport";
import { rewards as catalogue } from "../../../scripts/content/rewards";
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

  it("offers the same active reward options to elders and volunteers", async () => {
    const elder = await createElder();
    const volunteer = await createVerifiedVolunteerDirect();
    const active = catalogue.filter((reward) => reward.active);
    expect(active.map((reward) => [reward.title, reward.pointsCost])).toEqual([
      ["RM5 grocery voucher", 100],
      ["Free blood pressure check", 150],
      ["Teh tarik and roti canai set", 120],
    ]);
    const created = [];
    for (const reward of active) created.push(await createReward(reward));
    for (const person of [elder, volunteer]) {
      const available = await list(person.id);
      for (const reward of created)
        expect(available.find((item) => item.id === reward.id)).toMatchObject({
          title: reward.title,
          pointsCost: reward.pointsCost,
        });
    }
  });

  it("only a coordinator creates rewards", async () => {
    const elder = await createElder();
    const res = await call("POST", "/api/rewards", {
      as: elder.id,
      body: { title: "x", pointsCost: 1, icon: "gift", category: "shop" },
    });
    expect(res.status).toBe(403);
    expect((await call("GET", "/api/rewards")).status).toBe(401);
  });

  it("caps a reward cost at 100000 points on create", async () => {
    const post = (pointsCost: number) =>
      call("POST", "/api/rewards", {
        as: coordinator.id,
        body: { title: "Cap test", pointsCost, icon: "gift", category: "shop" },
      });
    expect((await post(100_000)).status).toBe(201);
    for (const pointsCost of [100_001, 999_999_999_999]) {
      const res = await post(pointsCost);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    }
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
    const redemption = (done.body as RedeemResult).redemption;
    expect(Date.parse(redemption.expiresAt!) - Date.parse(redemption.redeemedAt)).toBe(
      30 * 86400000,
    );
    expect(await status()).toMatchObject({ status: "redeemed" });
    expect((await status())?.redeemedAt).toBeDefined();

    const again = await call("POST", `/api/rewards/${reward.id}/redeem`, { as: elder.id });
    expect(JSON.stringify(again.body)).toContain("ALREADY_DONE");
    expect((await getUser(elder.id))?.points).toBe(60);
  });

  it("uses only the caller's redeemed voucher once without spending points again", async () => {
    const volunteer = await createVerifiedVolunteerDirect();
    const other = await createVerifiedVolunteerDirect();
    const reward = await createReward();
    const path = `/api/rewards/${reward.id}/use`;
    expect((await call("POST", path, { as: volunteer.id })).status).toBe(404);
    await givePoints(volunteer.id, 100);
    await call("POST", `/api/rewards/${reward.id}/redeem`, { as: volunteer.id });
    expect(
      (await list(volunteer.id)).find((item) => item.id === reward.id)?.usedAt,
    ).toBeUndefined();
    expect((await call("POST", path, { as: other.id })).status).toBe(404);
    const used = await call("POST", path, { as: volunteer.id });
    expect(used.status).toBe(200);
    const timestamp = (used.body as Redemption).usedAt;
    expect(timestamp).toBeDefined();
    const repeated = await call("POST", path, { as: volunteer.id });
    expect(repeated.status).toBe(200);
    expect((repeated.body as Redemption).usedAt).toBe(timestamp);
    expect((await list(volunteer.id)).find((item) => item.id === reward.id)).toMatchObject({
      status: "redeemed",
      usedAt: timestamp,
    });
    expect((await getUser(volunteer.id))?.points).toBe(60);
  });

  it("rejects using an expired voucher", async () => {
    const volunteer = await createVerifiedVolunteerDirect();
    const reward = await createReward();
    await givePoints(volunteer.id, 100);
    await call("POST", `/api/rewards/${reward.id}/redeem`, { as: volunteer.id });
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: { PK: `USER#${volunteer.id}`, SK: `REDEEM#${reward.id}` },
        UpdateExpression: "SET expiresAt = :past",
        ExpressionAttributeValues: { ":past": "2020-01-01T00:00:00Z" },
      }),
    );
    const result = await call("POST", `/api/rewards/${reward.id}/use`, { as: volunteer.id });
    expect(result.status).toBe(409);
    expect(JSON.stringify(result.body)).toContain("This voucher has expired");
    expect(
      (await list(volunteer.id)).find((item) => item.id === reward.id)?.usedAt,
    ).toBeUndefined();
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
