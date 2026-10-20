import { voucherExpiry } from "@sdh/contracts";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { Paged, PointsLedgerEntry, PointsSourceType, Reward } from "@sdh/contracts";
import { db, fromItem, table, transact, type TransactItem } from "../../lib/db";
import { decodeCursor, toPaged } from "../../lib/paging";
import { nowIso } from "../../lib/time";

const LEDGER_ENTITY = "POINTS";
const GUARD_ENTITY = "AWARD_GUARD";
const REDEMPTION_ENTITY = "REDEMPTION";
const LEDGER_PREFIX = "POINTS#";

export interface Award {
  awardKey: string;
  sourceType: Exclude<PointsSourceType, "redemption">;
  sourceId: string;
  points: number;
  title: string;
}

export type AwardOutcome = "awarded" | "already_awarded" | "conflict" | "rejected";
export type RedeemOutcome =
  "redeemed" | "already_redeemed" | "insufficient_points" | "reward_unavailable" | "conflict";

const userPk = (userId: string) => `USER#${userId}`;
const profileKey = (userId: string) => ({ PK: userPk(userId), SK: "PROFILE" });
const ledgerKey = (userId: string, awardedAt: string, awardKey: string) => ({
  PK: userPk(userId),
  SK: `${LEDGER_PREFIX}${awardedAt}#${awardKey}`,
});

function ledgerPut(userId: string, entry: PointsLedgerEntry): TransactItem {
  return {
    Put: {
      TableName: table(),
      Item: {
        ...ledgerKey(userId, entry.awardedAt, entry.awardKey),
        entity: LEDGER_ENTITY,
        ...entry,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    },
  };
}

// Item order is part of the contract: [0] guard, [1] ledger, [2] profile balance.
export function awardItems(userId: string, award: Award): TransactItem[] {
  if (!Number.isInteger(award.points) || award.points <= 0) {
    throw new RangeError("Award points must be a positive integer");
  }
  const awardedAt = nowIso();
  return [
    {
      Put: {
        TableName: table(),
        Item: {
          PK: userPk(userId),
          SK: `AWARD#${award.awardKey}`,
          entity: GUARD_ENTITY,
          awardKey: award.awardKey,
          awardedAt,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
    ledgerPut(userId, { ...award, awardedAt }),
    {
      Update: {
        TableName: table(),
        Key: profileKey(userId),
        UpdateExpression: "ADD points :p, lifetimePoints :p",
        ConditionExpression: "attribute_exists(PK)",
        ExpressionAttributeValues: { ":p": award.points },
      },
    },
  ];
}

// Extra items run after the award items in the same transaction, so the caller's own write is
// atomic with the award. Their condition failures are reported as "rejected".
export async function awardOnce(
  userId: string,
  award: Award,
  extraItems: TransactItem[] = [],
): Promise<AwardOutcome> {
  const result = await transact([...awardItems(userId, award), ...extraItems]);
  if (result.ok) return "awarded";
  if (result.conflict) return "conflict";
  return result.reasons[0] === "ConditionalCheckFailed" ? "already_awarded" : "rejected";
}

// Item order: [0] guard, [1] balance, [2] ledger, [3] reward must still be active.
export function redeemItems(
  userId: string,
  reward: Pick<Reward, "id" | "title" | "pointsCost">,
): TransactItem[] {
  const redeemedAt = nowIso();
  return [
    {
      Put: {
        TableName: table(),
        Item: {
          PK: userPk(userId),
          SK: `REDEEM#${reward.id}`,
          entity: REDEMPTION_ENTITY,
          rewardId: reward.id,
          title: reward.title,
          pointsSpent: reward.pointsCost,
          redeemedAt,
          expiresAt: voucherExpiry(redeemedAt),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
    {
      Update: {
        TableName: table(),
        Key: profileKey(userId),
        UpdateExpression: "ADD points :neg",
        ConditionExpression: "points >= :cost",
        ExpressionAttributeValues: { ":neg": -reward.pointsCost, ":cost": reward.pointsCost },
      },
    },
    ledgerPut(userId, {
      awardKey: `redemption:${reward.id}`,
      sourceType: "redemption",
      sourceId: reward.id,
      points: -reward.pointsCost,
      title: reward.title,
      awardedAt: redeemedAt,
    }),
    {
      ConditionCheck: {
        TableName: table(),
        Key: { PK: `REWARD#${reward.id}`, SK: "META" },
        ConditionExpression: "active = :true",
        ExpressionAttributeValues: { ":true": true },
      },
    },
  ];
}

export async function redeem(
  userId: string,
  reward: Pick<Reward, "id" | "title" | "pointsCost">,
): Promise<RedeemOutcome> {
  const result = await transact(redeemItems(userId, reward));
  if (result.ok) return "redeemed";
  if (result.conflict) return "conflict";
  const failed = (index: number) => result.reasons[index] === "ConditionalCheckFailed";
  if (failed(0)) return "already_redeemed";
  if (failed(1)) return "insufficient_points";
  if (failed(3)) return "reward_unavailable";
  throw new Error(`Redemption cancelled: ${result.reasons.join(",")}`);
}

export async function listLedger(
  userId: string,
  cursor: string | undefined,
  limit: number,
): Promise<Paged<PointsLedgerEntry>> {
  const result = await db().send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": userPk(userId), ":prefix": LEDGER_PREFIX },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: decodeCursor(cursor, { PK: userPk(userId) }),
    }),
  );
  const items = (result.Items ?? []).map((item) => fromItem<PointsLedgerEntry>(item));
  return toPaged(items, result.LastEvaluatedKey);
}
