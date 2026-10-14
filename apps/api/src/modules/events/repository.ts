import { GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { CommunityEvent, Contribution, Role, User } from "@sdh/contracts";
import { db, fromItem, isConditionFailure, table } from "../../lib/db";
import { contributionPut } from "../contributions/repository";

const EVENT_ENTITY = "EVENT";
const SIGNUP_ENTITY = "EVENT_SIGNUP";
// A DynamoDB transaction holds at most 100 items.
const MAX_TRANSACTION_ITEMS = 100;

export interface Signup {
  eventId: string;
  userId: string;
  role: Role;
  name: string;
  joinedAt: string;
}

export type JoinOutcome = "joined" | "already_joined" | "full_or_closed";

const key = (id: string) => ({ PK: `EVENT#${id}`, SK: "META" });
const byStartKeys = (event: Pick<CommunityEvent, "startsAt">) => ({
  GSI1PK: "EVENT",
  GSI1SK: event.startsAt,
});

const toEvent = (item: Record<string, unknown>) => fromItem<CommunityEvent>(item);

export async function putEvent(event: CommunityEvent): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { ...key(event.id), ...byStartKeys(event), entity: EVENT_ENTITY, ...event },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function getEvent(id: string): Promise<CommunityEvent | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: key(id) }));
  return result.Item ? toEvent(result.Item) : undefined;
}

// Soonest first. Completed events drop out of GSI1, so the index holds upcoming ones only.
export async function listUpcomingEvents(now: string): Promise<CommunityEvent[]> {
  const events: CommunityEvent[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk AND GSI1SK >= :now",
        ExpressionAttributeValues: { ":pk": "EVENT", ":now": now },
        ExclusiveStartKey: startKey,
      }),
    );
    events.push(...(result.Items ?? []).map(toEvent));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return events;
}

export async function listSignups(eventId: string): Promise<Signup[]> {
  const signups: Signup[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `EVENT#${eventId}`, ":prefix": "SIGNUP#" },
        ExclusiveStartKey: startKey,
      }),
    );
    signups.push(...(result.Items ?? []).map((item) => fromItem<Signup>(item)));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return signups;
}

export async function listJoinedEventIds(userId: string, now: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk AND GSI2SK >= :now",
        ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":now": now },
        ExclusiveStartKey: startKey,
      }),
    );
    for (const item of result.Items ?? []) ids.add(fromItem<Signup>(item).eventId);
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return ids;
}

// Signup and counter move together; the cancellation reasons follow the item order below.
export async function joinEvent(
  event: CommunityEvent,
  user: User,
  joinedAt: string,
): Promise<JoinOutcome> {
  const signup: Signup = {
    eventId: event.id,
    userId: user.id,
    role: user.role,
    name: user.name,
    joinedAt,
  };
  try {
    await db().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: table(),
              Item: {
                PK: `EVENT#${event.id}`,
                SK: `SIGNUP#${user.id}`,
                GSI2PK: `USER#${user.id}`,
                GSI2SK: event.startsAt,
                entity: SIGNUP_ENTITY,
                ...signup,
              },
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Update: {
              TableName: table(),
              Key: key(event.id),
              UpdateExpression: "SET signupCount = signupCount + :one, updatedAt = :now",
              ConditionExpression: "signupCount < #capacity AND #status = :upcoming",
              ExpressionAttributeNames: { "#capacity": "capacity", "#status": "status" },
              ExpressionAttributeValues: { ":one": 1, ":upcoming": "upcoming", ":now": joinedAt },
            },
          },
        ],
      }),
    );
    return "joined";
  } catch (error) {
    if (!isConditionFailure(error)) throw error;
    const reasons = (error as { CancellationReasons?: { Code?: string }[] }).CancellationReasons;
    return reasons?.[0]?.Code === "ConditionalCheckFailed" ? "already_joined" : "full_or_closed";
  }
}

// Returns false when the event was no longer upcoming. The status flip rides in the first
// transaction so it is atomic with its contributions; any overflow beyond 100 items goes in
// follow-up transactions, so a crash mid-way can leave later contributions unrecorded.
export async function completeEvent(
  id: string,
  completedAt: string,
  contributions: Contribution[],
): Promise<boolean> {
  const update = {
    Update: {
      TableName: table(),
      Key: key(id),
      UpdateExpression: "SET #status = :completed, updatedAt = :now REMOVE GSI1PK, GSI1SK",
      ConditionExpression: "#status = :upcoming",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":completed": "completed",
        ":upcoming": "upcoming",
        ":now": completedAt,
      },
    },
  };
  const puts = contributions.map(contributionPut);
  const firstBatch = puts.slice(0, MAX_TRANSACTION_ITEMS - 1);
  try {
    await db().send(new TransactWriteCommand({ TransactItems: [update, ...firstBatch] }));
  } catch (error) {
    if (isConditionFailure(error)) return false;
    throw error;
  }
  for (let i = firstBatch.length; i < puts.length; i += MAX_TRANSACTION_ITEMS) {
    await db().send(
      new TransactWriteCommand({ TransactItems: puts.slice(i, i + MAX_TRANSACTION_ITEMS) }),
    );
  }
  return true;
}
