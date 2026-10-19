import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Challenge, CreateChallengeBody, User } from "@sdh/contracts";
import { randomUUID } from "node:crypto";
import { db, table } from "../../lib/db";
import { call } from "../../test/api";
import { contributionPut } from "../contributions/repository";
import { newContribution } from "../contributions/service";
import { awardOnce } from "../points/service";
import { putChallenge } from "../challenges/repository";
import { updateProfile } from "../users/repository";

const DAY_MS = 24 * 60 * 60 * 1000;
export const inDays = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString();

export const challengeBody = (
  overrides: Partial<CreateChallengeBody> = {},
): Record<string, unknown> => ({
  title: "Walk 5,000 steps",
  icon: "walk",
  category: "fitness",
  mode: "individual",
  goal: { target: 5000, unit: "steps", type: "steps" },
  points: 50,
  endsOn: inDays(10),
  ...overrides,
});

export async function createChallengeVia(
  coordinatorId: string,
  overrides: Partial<CreateChallengeBody> = {},
): Promise<Challenge> {
  const res = await call("POST", "/api/challenges", {
    as: coordinatorId,
    body: challengeBody(overrides),
  });
  if (res.status !== 201) throw new Error(`createChallenge failed: ${JSON.stringify(res.body)}`);
  return res.body as Challenge;
}

// Writes a challenge that has already ended; the API refuses to create one.
export async function putEndedChallenge(
  coordinatorId: string,
  overrides: Partial<Challenge> = {},
): Promise<Challenge> {
  const now = new Date().toISOString();
  const challenge: Challenge = {
    id: randomUUID(),
    title: "Old challenge",
    description: "",
    icon: "walk",
    category: "fitness",
    mode: "individual",
    audience: "all",
    goal: { target: 10, unit: "steps", type: "steps" },
    points: 20,
    requiresVerification: false,
    endsOn: new Date(Date.now() - DAY_MS).toISOString(),
    createdBy: coordinatorId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await putChallenge(challenge);
  return challenge;
}

export const givePoints = (userId: string, points: number) =>
  awardOnce(userId, {
    awardKey: `test:${randomUUID()}`,
    sourceType: "check_in",
    sourceId: "test",
    points,
    title: "Test points",
  });

export async function giveContributions(volunteerId: string, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    const put = contributionPut(
      newContribution({
        volunteerId,
        source: "event",
        sourceId: randomUUID(),
        title: "Test task",
        minutes: 30,
      }),
    ).Put;
    await db().send(new PutCommand({ ...put, TableName: table() }));
  }
}

export const optIn = (user: User): Promise<User> =>
  updateProfile(user.id, { leaderboardOptIn: true }, new Date().toISOString());
