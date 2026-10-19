import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { Redemption, Reward } from "@sdh/contracts";
import { db, table } from "../../lib/db";

const ENTITY = "REWARD";

const key = (id: string) => ({ PK: `REWARD#${id}`, SK: "META" });

export function toReward(item: Record<string, unknown>): Reward {
  const r = item as unknown as Reward;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    pointsCost: r.pointsCost,
    ...(r.partner !== undefined ? { partner: r.partner } : {}),
    ...(r.minVolunteerTasks !== undefined ? { minVolunteerTasks: r.minVolunteerTasks } : {}),
    icon: r.icon,
    audience: r.audience,
    category: r.category,
    active: r.active,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const toRedemption = (item: Record<string, unknown>): Redemption => {
  const r = item as unknown as Redemption;
  return {
    rewardId: r.rewardId,
    title: r.title,
    pointsSpent: r.pointsSpent,
    redeemedAt: r.redeemedAt,
  };
};

export async function putReward(reward: Reward): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: {
        ...key(reward.id),
        GSI1PK: "REWARD",
        GSI1SK: reward.createdAt,
        entity: ENTITY,
        ...reward,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function getReward(id: string): Promise<Reward | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: key(id) }));
  return result.Item ? toReward(result.Item) : undefined;
}

export async function listRewards(): Promise<Reward[]> {
  const rewards: Reward[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": "REWARD" },
        ExclusiveStartKey: startKey,
      }),
    );
    rewards.push(...(result.Items ?? []).map(toReward));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return rewards;
}

export async function listRedemptions(userId: string): Promise<Redemption[]> {
  const redemptions: Redemption[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": "REDEEM#" },
        ExclusiveStartKey: startKey,
      }),
    );
    redemptions.push(...(result.Items ?? []).map(toRedemption));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return redemptions;
}

export async function getRedemption(
  userId: string,
  rewardId: string,
): Promise<Redemption | undefined> {
  const result = await db().send(
    new GetCommand({ TableName: table(), Key: { PK: `USER#${userId}`, SK: `REDEEM#${rewardId}` } }),
  );
  return result.Item ? toRedemption(result.Item) : undefined;
}
