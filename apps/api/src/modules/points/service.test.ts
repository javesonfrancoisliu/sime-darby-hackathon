import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { User } from "@sdh/contracts";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { db, table } from "../../lib/db";
import { createElder, createVerifiedVolunteerDirect } from "../../test/people";
import { useTestTable } from "../../test/table";
import { getUser } from "../users/repository";
import { awardOnce, ledgerPage, redeem, type Award } from "./service";

useTestTable();

const award = (overrides: Partial<Award> = {}): Award => ({
  awardKey: `check_in:${randomUUID()}`,
  sourceType: "check_in",
  sourceId: "day",
  points: 10,
  title: "Daily check-in",
  ...overrides,
});

async function putReward(cost: number, active = true) {
  const reward = { id: randomUUID(), title: "Coffee voucher", pointsCost: cost };
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { PK: `REWARD#${reward.id}`, SK: "META", entity: "REWARD", active, ...reward },
    }),
  );
  return reward;
}

async function balance(user: User) {
  const fresh = await getUser(user.id);
  return { points: fresh?.points, lifetimePoints: fresh?.lifetimePoints };
}

describe("points", () => {
  let volunteer: User;
  beforeAll(async () => {
    volunteer = await createVerifiedVolunteerDirect();
  });

  it("awards once and updates both balances", async () => {
    const user = await createVerifiedVolunteerDirect();
    expect(await awardOnce(user.id, award({ awardKey: "k1", points: 60 }))).toBe("awarded");
    expect(await balance(user)).toEqual({ points: 60, lifetimePoints: 60 });
    const page = await ledgerPage(user.id);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ awardKey: "k1", points: 60, sourceType: "check_in" });
  });

  it("a double award is a no-op", async () => {
    const user = await createVerifiedVolunteerDirect();
    const a = award();
    expect(await awardOnce(user.id, a)).toBe("awarded");
    expect(await awardOnce(user.id, a)).toBe("already_awarded");
    expect(await balance(user)).toEqual({ points: 10, lifetimePoints: 10 });
    expect((await ledgerPage(user.id)).items).toHaveLength(1);
  });

  it("parallel awards of one key credit once", async () => {
    const user = await createVerifiedVolunteerDirect();
    const a = award();
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => awardOnce(user.id, a)));
    expect(outcomes.filter((o) => o === "awarded")).toHaveLength(1);
    expect(
      outcomes.every((o) => o === "awarded" || o === "already_awarded" || o === "conflict"),
    ).toBe(true);
    expect(await balance(user)).toEqual({ points: 10, lifetimePoints: 10 });
  });

  it("a missing profile awards nothing and creates no phantom item", async () => {
    const ghost = randomUUID();
    expect(await awardOnce(ghost, award())).toBe("rejected");
    const profile = await db().send(
      new GetCommand({ TableName: table(), Key: { PK: `USER#${ghost}`, SK: "PROFILE" } }),
    );
    expect(profile.Item).toBeUndefined();
    expect((await ledgerPage(ghost)).items).toEqual([]);
  });

  it("redeems an affordable reward and records a negative ledger entry", async () => {
    const user = await createVerifiedVolunteerDirect();
    await awardOnce(user.id, award({ points: 100 }));
    const reward = await putReward(40);
    expect(await redeem(user.id, reward)).toBe("redeemed");
    expect(await balance(user)).toEqual({ points: 60, lifetimePoints: 100 });
    const entries = (await ledgerPage(user.id)).items;
    expect(entries[0]).toMatchObject({ sourceType: "redemption", points: -40 });
    expect(await redeem(user.id, reward)).toBe("already_redeemed");
  });

  it("refuses an unaffordable reward without side effects", async () => {
    const user = await createVerifiedVolunteerDirect();
    await awardOnce(user.id, award({ points: 30 }));
    const reward = await putReward(40);
    expect(await redeem(user.id, reward)).toBe("insufficient_points");
    expect(await balance(user)).toEqual({ points: 30, lifetimePoints: 30 });
    expect((await ledgerPage(user.id)).items).toHaveLength(1);
  });

  it("refuses an inactive or missing reward", async () => {
    const user = await createVerifiedVolunteerDirect();
    await awardOnce(user.id, award({ points: 100 }));
    expect(await redeem(user.id, await putReward(10, false))).toBe("reward_unavailable");
    const missing = { id: randomUUID(), title: "Gone", pointsCost: 10 };
    expect(await redeem(user.id, missing)).toBe("reward_unavailable");
    expect(await balance(user)).toEqual({ points: 100, lifetimePoints: 100 });
  });

  it("two parallel redeems with one affordable spend only once", async () => {
    const user = await createVerifiedVolunteerDirect();
    await awardOnce(user.id, award({ points: 50 }));
    const [a, b] = await Promise.all([putReward(40), putReward(40)]);
    const outcomes = await Promise.all([redeem(user.id, a), redeem(user.id, b)]);
    expect(outcomes.filter((o) => o === "redeemed")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "insufficient_points" || o === "conflict")).toHaveLength(1);
    expect(await balance(user)).toEqual({ points: 10, lifetimePoints: 50 });
  });

  it("a missing profile cannot redeem", async () => {
    expect(await redeem(randomUUID(), await putReward(10))).toBe("insufficient_points");
  });

  it("pages the ledger newest first", async () => {
    const user = await createElder();
    for (let i = 0; i < 3; i += 1) {
      await awardOnce(user.id, award({ awardKey: `k:${i}` }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const first = await ledgerPage(user.id, undefined, 2);
    expect(first.items.map((e) => e.awardKey)).toEqual(["k:2", "k:1"]);
    expect(first.nextCursor).toBeDefined();
    const second = await ledgerPage(user.id, first.nextCursor, 2);
    expect(second.items.map((e) => e.awardKey)).toEqual(["k:0"]);
    expect(second.nextCursor).toBeUndefined();
    await expect(ledgerPage(volunteer.id, first.nextCursor, 2)).rejects.toThrow();
  });
});
