import { randomUUID } from "node:crypto";
import {
  Precinct,
  type Challenge,
  type ChallengeActionResult,
  type ChallengeProgress,
  type ChallengeWithProgress,
  type ChallengesQuery,
  type ContributeResult,
  type CreateChallengeBody,
  type PendingVerification,
  type User,
} from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { klDate, nowIso, toUtc } from "../../lib/time";
import { transact } from "../../lib/db";
import { awardOnce, TEAM_CONTRIBUTION_POINTS, type AwardOutcome } from "../points/service";
import { displayName } from "../play/displayName";
import { getQuiz } from "../quizzes/repository";
import { getUser } from "../users/repository";
import {
  completionItem,
  contributionItems,
  getChallenge,
  getProgress,
  getTeamCurrent,
  joinChallenge,
  listChallenges,
  listPending,
  listProgress,
  putChallenge,
  requestVerification,
  setCurrent,
  type ExpectedStatus,
} from "./repository";

const isEnded = (challenge: Challenge, nowMs: number): boolean =>
  Date.parse(challenge.endsOn) <= nowMs;

const precinctOf = (user: User): Precinct | undefined => {
  const parsed = Precinct.safeParse(user.area);
  return parsed.success ? parsed.data : undefined;
};

// Coordinators see everything; others see "all" plus their own role's challenges.
const visibleTo = (user: User, challenge: Challenge): boolean =>
  user.role === "coordinator" || challenge.audience === "all" || challenge.audience === user.role;

async function requireChallenge(id: string): Promise<Challenge> {
  const challenge = await getChallenge(id);
  if (!challenge) throw new HttpError("NOT_FOUND", "Challenge not found");
  return challenge;
}

async function requireVisible(user: User, id: string): Promise<Challenge> {
  const challenge = await requireChallenge(id);
  if (!visibleTo(user, challenge)) throw new HttpError("FORBIDDEN", "Not available for your role");
  return challenge;
}

function requireOpen(challenge: Challenge): void {
  if (isEnded(challenge, Date.now())) throw new HttpError("CONFLICT", "This challenge has ended");
}

function requireIndividual(challenge: Challenge): void {
  if (challenge.mode !== "individual") {
    throw new HttpError("VALIDATION_FAILED", "This is a team challenge");
  }
}

export async function createChallenge(
  coordinator: User,
  body: CreateChallengeBody,
): Promise<Challenge> {
  const endsOn = toUtc(body.endsOn);
  if (Date.parse(endsOn) <= Date.now()) {
    throw new HttpError("VALIDATION_FAILED", "endsOn: must be in the future");
  }
  if (body.goal.type === "quiz") {
    if (body.mode !== "individual") {
      throw new HttpError("VALIDATION_FAILED", "mode: quiz challenges are individual");
    }
    if (!body.quizId) throw new HttpError("VALIDATION_FAILED", "quizId: required for a quiz goal");
  }
  if (body.quizId && !(await getQuiz(body.quizId))) {
    throw new HttpError("VALIDATION_FAILED", "quizId: quiz not found");
  }
  const now = nowIso();
  const challenge: Challenge = {
    ...body,
    endsOn,
    id: randomUUID(),
    createdBy: coordinator.id,
    createdAt: now,
    updatedAt: now,
  };
  await putChallenge(challenge);
  return challenge;
}

export async function listFor(
  user: User,
  query: ChallengesQuery,
): Promise<ChallengeWithProgress[]> {
  const nowMs = Date.now();
  const [all, progress] = await Promise.all([
    listChallenges(),
    user.role === "coordinator" ? Promise.resolve([]) : listProgress(user.id),
  ]);
  const byId = new Map(progress.map((p) => [p.challengeId, p]));
  const precinct = precinctOf(user);
  const visible = all.filter(
    (c) => visibleTo(user, c) && (query.audience === undefined || c.audience === query.audience),
  );
  return Promise.all(
    visible.map(async (challenge): Promise<ChallengeWithProgress> => {
      const mine = byId.get(challenge.id);
      const team =
        challenge.mode === "team" && precinct && user.role !== "coordinator"
          ? { precinct, current: await getTeamCurrent(challenge.id, precinct) }
          : undefined;
      return {
        ...challenge,
        ended: isEnded(challenge, nowMs),
        ...(mine ? { progress: mine } : {}),
        ...(team ? { teamProgress: team } : {}),
      };
    }),
  );
}

export async function join(user: User, id: string): Promise<ChallengeActionResult> {
  const challenge = await requireVisible(user, id);
  requireIndividual(challenge);
  requireOpen(challenge);
  return { progress: await joinChallenge(user.id, id, nowIso()), pointsAwarded: 0 };
}

export async function updateProgress(
  user: User,
  id: string,
  current: number,
): Promise<ChallengeActionResult> {
  const challenge = await requireVisible(user, id);
  requireIndividual(challenge);
  if (challenge.goal.type === "quiz") {
    throw new HttpError("VALIDATION_FAILED", "Quiz challenges are completed by passing the quiz");
  }
  requireOpen(challenge);
  const existing = await getProgress(user.id, id);
  if (!existing) throw new HttpError("NOT_FOUND", "Join this challenge first");
  const clamped = Math.min(current, challenge.goal.target);
  const updated = await setCurrent(user.id, id, clamped);
  if (!updated) throw new HttpError("ALREADY_DONE", "This challenge is already finished");
  return { progress: updated, pointsAwarded: 0 };
}

type FinishResult =
  | { kind: "done"; pointsAwarded: number }
  | { kind: "already_done" }
  | { kind: "conflict" }
  | { kind: "stale" };

// Marks progress completed and awards the challenge's points in one transaction (award key
// challenge:<id>, so a challenge pays out once however it is completed).
async function finish(
  userId: string,
  challenge: Challenge,
  expected: ExpectedStatus,
  sourceType: "challenge" | "quiz",
): Promise<FinishResult> {
  const now = nowIso();
  const progress = completionItem(userId, challenge.id, challenge.goal.target, now, expected);
  let outcome: AwardOutcome;
  if (challenge.points > 0) {
    outcome = await awardOnce(
      userId,
      {
        awardKey: `challenge:${challenge.id}`,
        sourceType,
        sourceId: challenge.id,
        points: challenge.points,
        title: challenge.title,
      },
      [progress],
    );
  } else {
    const result = await transact([progress]);
    outcome = result.ok ? "awarded" : result.conflict ? "conflict" : "rejected";
  }
  if (outcome === "awarded") return { kind: "done", pointsAwarded: challenge.points };
  if (outcome === "already_awarded") return { kind: "already_done" };
  if (outcome === "conflict") return { kind: "conflict" };
  const current = await getProgress(userId, challenge.id);
  return current?.status === "completed" ? { kind: "already_done" } : { kind: "stale" };
}

function failFinish(result: Exclude<FinishResult, { kind: "done" }>): never {
  if (result.kind === "already_done") {
    throw new HttpError("ALREADY_DONE", "This challenge is already completed");
  }
  if (result.kind === "conflict") throw new HttpError("CONFLICT_RETRY", "Try again");
  throw new HttpError("CONFLICT", "This challenge is not waiting for that step");
}

export async function complete(user: User, id: string): Promise<ChallengeActionResult> {
  const challenge = await requireVisible(user, id);
  requireIndividual(challenge);
  if (challenge.goal.type === "quiz") {
    throw new HttpError("VALIDATION_FAILED", "Quiz challenges are completed by passing the quiz");
  }
  requireOpen(challenge);
  const progress = await getProgress(user.id, id);
  if (!progress) throw new HttpError("NOT_FOUND", "Join this challenge first");
  if (progress.status === "completed") {
    throw new HttpError("ALREADY_DONE", "This challenge is already completed");
  }
  if (progress.current < challenge.goal.target) {
    throw new HttpError("VALIDATION_FAILED", "The goal has not been reached yet");
  }
  if (challenge.requiresVerification) {
    if (progress.status === "pending_verification") return { progress, pointsAwarded: 0 };
    const requested = await requestVerification(user.id, id, nowIso());
    if (!requested) throw new HttpError("CONFLICT", "This challenge changed; try again");
    return { progress: requested, pointsAwarded: 0 };
  }
  const result = await finish(user.id, challenge, "in_progress", "challenge");
  if (result.kind !== "done") failFinish(result);
  const done = await getProgress(user.id, id);
  return { progress: done as ChallengeProgress, pointsAwarded: result.pointsAwarded };
}

export async function contribute(user: User, id: string): Promise<ContributeResult> {
  const challenge = await requireVisible(user, id);
  if (challenge.mode !== "team") {
    throw new HttpError("VALIDATION_FAILED", "This is not a team challenge");
  }
  requireOpen(challenge);
  const precinct = precinctOf(user);
  if (!precinct) {
    throw new HttpError("VALIDATION_FAILED", "Set your neighbourhood to join a team");
  }
  const now = nowIso();
  const day = klDate(now);
  const outcome = await awardOnce(
    user.id,
    {
      awardKey: `team:${id}:${day}`,
      sourceType: "team_contribution",
      sourceId: id,
      points: TEAM_CONTRIBUTION_POINTS,
      title: challenge.title,
    },
    contributionItems(user.id, id, precinct, day, now),
  );
  if (outcome === "conflict") throw new HttpError("CONFLICT_RETRY", "Try again");
  if (outcome !== "awarded") {
    throw new HttpError("ALREADY_DONE", "You already contributed today");
  }
  return {
    teamProgress: { precinct, current: await getTeamCurrent(id, precinct) },
    pointsAwarded: TEAM_CONTRIBUTION_POINTS,
  };
}

export async function pendingFor(id: string): Promise<PendingVerification[]> {
  await requireChallenge(id);
  const records = await listPending(id);
  const rows = await Promise.all(
    records.map(async (record): Promise<PendingVerification | undefined> => {
      const person = await getUser(record.userId);
      if (!person) return undefined;
      return {
        userId: record.userId,
        displayName: displayName(person.name),
        current: record.current,
        requestedAt: record.requestedAt,
      };
    }),
  );
  return rows.filter((row): row is PendingVerification => row !== undefined);
}

export async function verify(id: string, userId: string): Promise<ChallengeActionResult> {
  const challenge = await requireChallenge(id);
  const progress = await getProgress(userId, id);
  if (!progress) throw new HttpError("NOT_FOUND", "No progress for that person");
  if (progress.status === "completed") {
    throw new HttpError("ALREADY_DONE", "This challenge is already completed");
  }
  if (progress.status !== "pending_verification") {
    throw new HttpError("CONFLICT", "That person has not asked for verification");
  }
  const result = await finish(userId, challenge, "pending_verification", "challenge");
  if (result.kind !== "done") failFinish(result);
  const done = await getProgress(userId, id);
  return { progress: done as ChallengeProgress, pointsAwarded: result.pointsAwarded };
}

// Called after a passed quiz: completes every open individual challenge that uses it. Verification
// is skipped because passing the quiz is the proof.
export async function completeForQuiz(user: User, quizId: string): Promise<void> {
  const nowMs = Date.now();
  const linked = (await listChallenges()).filter(
    (c) =>
      c.quizId === quizId && c.mode === "individual" && visibleTo(user, c) && !isEnded(c, nowMs),
  );
  for (const challenge of linked) {
    const result = await finish(user.id, challenge, "not_completed", "quiz");
    if (result.kind === "conflict" || result.kind === "stale") {
      throw new HttpError("CONFLICT_RETRY", "Try again");
    }
  }
}

export { countCompleted } from "./repository";
