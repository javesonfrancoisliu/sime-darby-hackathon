import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Challenge, ChallengeProgress, ProgressStatus } from "@sdh/contracts";
import { db, isConditionFailure, table, type TransactItem } from "../../lib/db";

const CHALLENGE_ENTITY = "CHALLENGE";
const PROGRESS_ENTITY = "CHALLENGE_PROGRESS";
const TEAM_ENTITY = "CHALLENGE_TEAM";
const TEAM_DAY_ENTITY = "TEAM_DAY_GUARD";
const PROGRESS_PREFIX = "CHALLENGE#";

const challengeKey = (id: string) => ({ PK: `CHALLENGE#${id}`, SK: "META" });
const progressKey = (userId: string, challengeId: string) => ({
  PK: `USER#${userId}`,
  SK: `${PROGRESS_PREFIX}${challengeId}`,
});
const teamKey = (challengeId: string, precinct: string) => ({
  PK: `CHALLENGE#${challengeId}`,
  SK: `TEAM#${precinct}`,
});
const pendingPartition = (challengeId: string) => `CHALLENGE_PENDING#${challengeId}`;

export interface PendingRecord {
  userId: string;
  current: number;
  requestedAt: string;
}

// Field by field so a stray stored attribute can never reach a response.
export function toChallenge(item: Record<string, unknown>): Challenge {
  const c = item as unknown as Challenge;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    icon: c.icon,
    category: c.category,
    mode: c.mode,
    audience: c.audience,
    goal: { target: c.goal.target, unit: c.goal.unit, type: c.goal.type },
    points: c.points,
    ...(c.teamReward !== undefined ? { teamReward: c.teamReward } : {}),
    requiresVerification: c.requiresVerification,
    ...(c.quizId !== undefined ? { quizId: c.quizId } : {}),
    ...(c.relatedEventId !== undefined ? { relatedEventId: c.relatedEventId } : {}),
    endsOn: c.endsOn,
    createdBy: c.createdBy,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function toProgress(item: Record<string, unknown>): ChallengeProgress {
  const p = item as unknown as ChallengeProgress;
  return {
    challengeId: p.challengeId,
    status: p.status,
    current: p.current,
    joinedAt: p.joinedAt,
    ...(p.completedAt !== undefined ? { completedAt: p.completedAt } : {}),
  };
}

export async function putChallenge(challenge: Challenge): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: {
        ...challengeKey(challenge.id),
        GSI1PK: "CHALLENGE",
        GSI1SK: challenge.endsOn,
        entity: CHALLENGE_ENTITY,
        ...challenge,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function getChallenge(id: string): Promise<Challenge | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: challengeKey(id) }));
  return result.Item ? toChallenge(result.Item) : undefined;
}

// Soonest ending first.
export async function listChallenges(): Promise<Challenge[]> {
  const challenges: Challenge[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": "CHALLENGE" },
        ExclusiveStartKey: startKey,
      }),
    );
    challenges.push(...(result.Items ?? []).map(toChallenge));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return challenges;
}

export async function getProgress(
  userId: string,
  challengeId: string,
): Promise<ChallengeProgress | undefined> {
  const result = await db().send(
    new GetCommand({ TableName: table(), Key: progressKey(userId, challengeId) }),
  );
  return result.Item ? toProgress(result.Item) : undefined;
}

export async function listProgress(userId: string): Promise<ChallengeProgress[]> {
  const progress: ChallengeProgress[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":prefix": PROGRESS_PREFIX },
        ExclusiveStartKey: startKey,
      }),
    );
    progress.push(...(result.Items ?? []).map(toProgress));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return progress;
}

// Joining twice is harmless: the second call returns the stored progress.
export async function joinChallenge(
  userId: string,
  challengeId: string,
  joinedAt: string,
): Promise<ChallengeProgress> {
  try {
    await db().send(
      new PutCommand({
        TableName: table(),
        Item: {
          ...progressKey(userId, challengeId),
          entity: PROGRESS_ENTITY,
          userId,
          challengeId,
          status: "in_progress",
          current: 0,
          joinedAt,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    return { challengeId, status: "in_progress", current: 0, joinedAt };
  } catch (error) {
    if (!isConditionFailure(error)) throw error;
    const existing = await getProgress(userId, challengeId);
    if (!existing) throw error;
    return existing;
  }
}

// Undefined when the progress is missing or no longer in progress.
export async function setCurrent(
  userId: string,
  challengeId: string,
  current: number,
): Promise<ChallengeProgress | undefined> {
  try {
    const result = await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: progressKey(userId, challengeId),
        UpdateExpression: "SET #current = :current",
        ConditionExpression: "#status = :inProgress",
        ExpressionAttributeNames: { "#current": "current", "#status": "status" },
        ExpressionAttributeValues: { ":current": current, ":inProgress": "in_progress" },
        ReturnValues: "ALL_NEW",
      }),
    );
    return toProgress(result.Attributes ?? {});
  } catch (error) {
    if (isConditionFailure(error)) return undefined;
    throw error;
  }
}

// Undefined when the progress was no longer in progress. The pending GSI entry feeds the verify queue.
export async function requestVerification(
  userId: string,
  challengeId: string,
  requestedAt: string,
): Promise<ChallengeProgress | undefined> {
  try {
    const result = await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: progressKey(userId, challengeId),
        UpdateExpression:
          "SET #status = :pending, requestedAt = :now, GSI1PK = :gsi1pk, GSI1SK = :now",
        ConditionExpression: "#status = :inProgress",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":pending": "pending_verification",
          ":inProgress": "in_progress",
          ":now": requestedAt,
          ":gsi1pk": pendingPartition(challengeId),
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    return toProgress(result.Attributes ?? {});
  } catch (error) {
    if (isConditionFailure(error)) return undefined;
    throw error;
  }
}

export async function listPending(challengeId: string): Promise<PendingRecord[]> {
  const records: PendingRecord[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": pendingPartition(challengeId) },
        ExclusiveStartKey: startKey,
      }),
    );
    for (const item of result.Items ?? []) {
      records.push({
        userId: item.userId as string,
        current: item.current as number,
        requestedAt: item.requestedAt as string,
      });
    }
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return records;
}

// "not_completed" is the quiz path: it may complete a challenge the person never joined.
export type ExpectedStatus = Exclude<ProgressStatus, "completed"> | "not_completed";

// Transaction entry that marks progress completed and drops it from the verify queue.
export function completionItem(
  userId: string,
  challengeId: string,
  target: number,
  completedAt: string,
  expected: ExpectedStatus,
): TransactItem {
  const values: Record<string, unknown> = {
    ":entity": PROGRESS_ENTITY,
    ":userId": userId,
    ":challengeId": challengeId,
    ":completed": "completed",
    ":target": target,
    ":now": completedAt,
  };
  let condition: string;
  if (expected === "not_completed") {
    condition = "attribute_not_exists(PK) OR #status <> :completed";
  } else {
    condition = "#status = :expected";
    values[":expected"] = expected;
  }
  return {
    Update: {
      TableName: table(),
      Key: progressKey(userId, challengeId),
      UpdateExpression:
        "SET entity = :entity, userId = :userId, challengeId = :challengeId, #status = :completed, " +
        "#current = :target, joinedAt = if_not_exists(joinedAt, :now), completedAt = :now " +
        "REMOVE GSI1PK, GSI1SK",
      ConditionExpression: condition,
      ExpressionAttributeNames: { "#status": "status", "#current": "current" },
      ExpressionAttributeValues: values,
    },
  };
}

export async function getTeamCurrent(challengeId: string, precinct: string): Promise<number> {
  const result = await db().send(
    new GetCommand({ TableName: table(), Key: teamKey(challengeId, precinct) }),
  );
  return (result.Item?.current as number | undefined) ?? 0;
}

// One contribution per person per KL day (the guard) adds one to the precinct total.
export function contributionItems(
  userId: string,
  challengeId: string,
  precinct: string,
  klDay: string,
  contributedAt: string,
): TransactItem[] {
  return [
    {
      Put: {
        TableName: table(),
        Item: {
          PK: `USER#${userId}`,
          SK: `TEAMDAY#${challengeId}#${klDay}`,
          entity: TEAM_DAY_ENTITY,
          challengeId,
          klDate: klDay,
          contributedAt,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
    {
      Update: {
        TableName: table(),
        Key: teamKey(challengeId, precinct),
        UpdateExpression: "SET entity = :entity, precinct = :precinct ADD #current :one",
        ExpressionAttributeNames: { "#current": "current" },
        ExpressionAttributeValues: { ":entity": TEAM_ENTITY, ":precinct": precinct, ":one": 1 },
      },
    },
  ];
}

// Counts completed challenges for the badge rule.
export async function countCompleted(userId: string): Promise<number> {
  const progress = await listProgress(userId);
  return progress.filter((p) => p.status === "completed").length;
}
