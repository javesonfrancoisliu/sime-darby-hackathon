import { GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Streak } from "@sdh/contracts";
import { db, table, type TransactItem } from "../../lib/db";

const ENTITY = "STREAK";

const key = (userId: string) => ({ PK: `USER#${userId}`, SK: "STREAK" });

export async function getStreak(userId: string): Promise<Streak | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: key(userId) }));
  const item = result.Item as Partial<Streak> | undefined;
  if (!item) return undefined;
  return {
    current: item.current ?? 0,
    best: item.best ?? 0,
    ...(item.lastCheckInDate !== undefined ? { lastCheckInDate: item.lastCheckInDate } : {}),
    recent: [...(item.recent ?? [])],
  };
}

// Conditional on today not being checked in yet, so two requests cannot both advance the streak.
export function checkInItem(
  userId: string,
  next: Streak,
  today: string,
  now: string,
): TransactItem {
  return {
    Update: {
      TableName: table(),
      Key: key(userId),
      UpdateExpression:
        "SET entity = :entity, #current = :current, #best = :best, lastCheckInDate = :today, " +
        "#recent = :recent, updatedAt = :now",
      ConditionExpression: "attribute_not_exists(lastCheckInDate) OR lastCheckInDate <> :today",
      ExpressionAttributeNames: { "#current": "current", "#best": "best", "#recent": "recent" },
      ExpressionAttributeValues: {
        ":entity": ENTITY,
        ":current": next.current,
        ":best": next.best,
        ":today": today,
        ":recent": next.recent,
        ":now": now,
      },
    },
  };
}
