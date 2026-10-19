import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { Badge } from "@sdh/contracts";
import { db, table } from "../../lib/db";

const ENTITY = "BADGE";

export function toBadge(item: Record<string, unknown>): Badge {
  const b = item as unknown as Badge;
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    icon: b.icon,
    kind: b.kind,
    threshold: b.threshold,
    audience: b.audience,
    createdAt: b.createdAt,
  };
}

export async function putBadge(badge: Badge): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: {
        PK: `BADGE#${badge.id}`,
        SK: "META",
        GSI1PK: "BADGE",
        GSI1SK: badge.createdAt,
        entity: ENTITY,
        ...badge,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function listBadges(): Promise<Badge[]> {
  const badges: Badge[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": "BADGE" },
        ExclusiveStartKey: startKey,
      }),
    );
    badges.push(...(result.Items ?? []).map(toBadge));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return badges;
}
