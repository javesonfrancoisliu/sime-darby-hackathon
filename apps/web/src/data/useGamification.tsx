import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Achievement,
  Badge,
  Challenge,
  ChallengeProgress,
  GamificationSummary,
  LeaderboardEntry,
  PointsLedgerEntry,
  Reward,
  RewardRedemption,
  RewardStatus,
} from "../types/gamification";
import { useSession } from "@sdh/api-client";
import { readJson, scopedKey, writeJson } from "../lib/storage";
import { awardPoints, summarize, type AwardInput } from "../lib/points";
import { claimReward, normaliseRedemptions } from "../lib/rewards";
import {
  MOCK_ACHIEVEMENTS,
  MOCK_BADGES,
  MOCK_CHALLENGES,
  MOCK_LEADERBOARD_OTHERS,
  MOCK_REWARDS,
} from "./gamification.mock";

// Reusable gamification state for the Young role. Client-only, persisted to
// localStorage so demo progress survives navigation/reload. All simulated.
//
// Separation of concerns (per the spec):
// - joining a challenge records progress but awards NO points;
// - logging progress updates `current` only;
// - completion runs a simulated verification step where required;
// - points are awarded ONLY on verified completion, through the ledger, which
//    de-dupes by (sourceType, sourceId) and by shared dedupeKey across sources.
//
// IMPORTANT (undercount fix): verified volunteering TASK COUNT is tracked in a
// separate id set, NOT derived from the points ledger. An activity that is both a
// challenge and a volunteering task is paid points once (ledger de-dupe) but must
// still count as one volunteering task toward milestones.

const ledgerKey = scopedKey("tc.points.ledger");
const progressKey = scopedKey("tc.challenge.progress");
const volTasksKey = scopedKey("tc.verifiedVolunteerTasks");
const redeemedKey = scopedKey("tc.redeemedRewards");
const CURRENT_USER_NAME = "You";

export type BadgeState = Badge & { earned: boolean; unlockHint: string };
export type AchievementState = Achievement & { earned: boolean };
export type RewardState = Reward & {
  status: RewardStatus;
  unlockHint: string;
  // Set when the reward has been (simulated) redeemed and a date is known.
  redeemedAt?: string;
};
// A redeemed reward for the Profile → My Rewards list.
export type ClaimedReward = Reward & { redeemedAt?: string };

// Reads persisted redemptions, migrating the legacy string[] shape. The actual
// migration logic lives in lib/rewards.ts (normaliseRedemptions) so it is unit
// tested directly.
function readRedeemed(userId: string | null): Record<string, RewardRedemption> {
  return normaliseRedemptions(readJson<unknown>(redeemedKey(userId), {}));
}

export type UseGamification = {
  challenges: Challenge[];
  progress: Record<string, ChallengeProgress>;
  ledger: PointsLedgerEntry[];
  summary: GamificationSummary;
  leaderboard: LeaderboardEntry[];
  badges: BadgeState[];
  achievements: AchievementState[];
  rewards: RewardState[];
  // Redeemed rewards, for Profile → My Rewards.
  claimedRewards: ClaimedReward[];
  // Join a challenge. Records in-progress state; awards no points.
  join: (challengeId: string) => void;
  // Set absolute progress toward the goal (self-reported).
  setProgress: (challengeId: string, current: number) => void;
  // Move a challenge whose progress has reached its goal to completion. If it
  // requires verification, it enters `pending_verification` first and awards no
  // points yet. Otherwise it completes and awards points.
  requestCompletion: (challengeId: string) => void;
  // Simulated verification step: completes a pending challenge and awards points.
  verifyCompletion: (challengeId: string) => void;
  // Award quiz points once the quiz is passed. De-duped by quiz id so repeating
  // the quiz never awards twice.
  awardQuiz: (quizId: string, points: number, label: string) => void;
  // Record a VERIFIED volunteering activity. Adds the task id to the separate
  // verified-task set (so it counts toward volunteering milestones exactly once)
  // AND awards de-duped points (shared dedupeKey prevents paying the same
  // activity twice when it is also a challenge). Self-reported completion must
  // NOT call this - only a simulated/real verification step should.
  verifyVolunteering: (input: {
    taskId: string;
    points: number;
    label: string;
    dedupeKey?: string;
  }) => void;
  // True once a reward has been (simulated) redeemed.
  redeem: (rewardId: string) => void;
  // Clears all demo gamification state (for testing / pre-demo reset).
  reset: () => void;
};

const GamificationContext = createContext<UseGamification | null>(null);

function useGamificationState(userId: string | null): UseGamification {
  const challenges = MOCK_CHALLENGES;
  const [ledger, setLedger] = useState<PointsLedgerEntry[]>(() => readJson(ledgerKey(userId), []));
  const [progress, setProgressState] = useState<Record<string, ChallengeProgress>>(() =>
    readJson(progressKey(userId), {}),
  );
  // Separate source of truth for verified volunteering task counting.
  const [verifiedVolTaskIds, setVerifiedVolTaskIds] = useState<string[]>(() =>
    readJson(volTasksKey(userId), []),
  );
  const [redeemedRewards, setRedeemedRewards] = useState<Record<string, RewardRedemption>>(() =>
    readRedeemed(userId),
  );

  useEffect(() => writeJson(ledgerKey(userId), ledger), [userId, ledger]);
  useEffect(() => writeJson(progressKey(userId), progress), [userId, progress]);
  useEffect(() => writeJson(volTasksKey(userId), verifiedVolTaskIds), [userId, verifiedVolTaskIds]);
  useEffect(() => writeJson(redeemedKey(userId), redeemedRewards), [userId, redeemedRewards]);

  const challengeById = useMemo(() => new Map(challenges.map((c) => [c.id, c])), [challenges]);

  const award = useCallback((input: AwardInput) => {
    setLedger((prev) => awardPoints(prev, input));
  }, []);

  const join = useCallback((challengeId: string) => {
    setProgressState((prev) => {
      if (prev[challengeId]) return prev;
      return {
        ...prev,
        [challengeId]: {
          challengeId,
          status: "in_progress",
          current: 0,
          joinedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const setProgress = useCallback((challengeId: string, current: number) => {
    setProgressState((prev) => {
      const existing = prev[challengeId];
      if (!existing || existing.status === "completed") return prev;
      return { ...prev, [challengeId]: { ...existing, current: Math.max(0, current) } };
    });
  }, []);

  const completeNow = useCallback(
    (challengeId: string) => {
      const challenge = challengeById.get(challengeId);
      if (!challenge) return;
      setProgressState((prev) => {
        const existing = prev[challengeId];
        if (!existing) return prev;
        return {
          ...prev,
          [challengeId]: {
            ...existing,
            status: "completed",
            completedAt: new Date().toISOString(),
          },
        };
      });
      award({
        sourceType: "challenge",
        sourceId: challenge.id,
        points: challenge.points,
        label: challenge.title,
        dedupeKey: challenge.dedupeKey,
      });
    },
    [challengeById, award],
  );

  const requestCompletion = useCallback(
    (challengeId: string) => {
      const challenge = challengeById.get(challengeId);
      if (!challenge) return;
      if (challenge.requiresVerification) {
        setProgressState((prev) => {
          const existing = prev[challengeId];
          if (!existing) return prev;
          return { ...prev, [challengeId]: { ...existing, status: "pending_verification" } };
        });
      } else {
        completeNow(challengeId);
      }
    },
    [challengeById, completeNow],
  );

  const verifyCompletion = useCallback(
    (challengeId: string) => {
      const existing = progress[challengeId];
      if (!existing || existing.status !== "pending_verification") return;
      completeNow(challengeId);
    },
    [progress, completeNow],
  );

  const awardQuiz = useCallback(
    (quizId: string, points: number, label: string) => {
      award({ sourceType: "quiz", sourceId: quizId, points, label });
    },
    [award],
  );

  const verifyVolunteering = useCallback<UseGamification["verifyVolunteering"]>(
    ({ taskId, points, label, dedupeKey }) => {
      // Count the task exactly once, independently of points de-dupe.
      setVerifiedVolTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
      // Award points, de-duped across sources by dedupeKey.
      award({ sourceType: "volunteering", sourceId: taskId, points, label, dedupeKey });
    },
    [award],
  );

  const reset = useCallback(() => {
    setLedger([]);
    setProgressState({});
    setVerifiedVolTaskIds([]);
    setRedeemedRewards({});
  }, []);

  const summary = useMemo(
    () => summarize(ledger, MOCK_BADGES, MOCK_ACHIEVEMENTS, verifiedVolTaskIds.length),
    [ledger, verifiedVolTaskIds.length],
  );

  const badges = useMemo<BadgeState[]>(
    () =>
      MOCK_BADGES.map((b) => ({
        ...b,
        earned: summary.earnedBadgeIds.includes(b.id),
        unlockHint: `Reach ${b.threshold} points`,
      })),
    [summary.earnedBadgeIds],
  );

  const achievements = useMemo<AchievementState[]>(
    () =>
      MOCK_ACHIEVEMENTS.map((a) => ({
        ...a,
        earned: summary.earnedAchievementIds.includes(a.id),
      })),
    [summary.earnedAchievementIds],
  );

  const rewards = useMemo<RewardState[]>(
    () =>
      MOCK_REWARDS.map((r) => {
        const meetsPoints = summary.totalPoints >= r.pointsCost;
        const meetsTasks =
          r.minVolunteerTasks == null || summary.completedVolunteerTasks >= r.minVolunteerTasks;
        const unlocked = meetsPoints && meetsTasks;
        const redemption = redeemedRewards[r.id];
        const status: RewardStatus = redemption ? "redeemed" : unlocked ? "available" : "locked";
        const needs: string[] = [];
        if (!meetsPoints) needs.push(`${r.pointsCost} points`);
        if (!meetsTasks && r.minVolunteerTasks != null) {
          needs.push(`${r.minVolunteerTasks} verified volunteering task(s)`);
        }
        const unlockHint = needs.length > 0 ? `Needs ${needs.join(" and ")}` : "Ready to redeem";
        return { ...r, status, unlockHint, redeemedAt: redemption?.redeemedAt };
      }),
    [summary.totalPoints, summary.completedVolunteerTasks, redeemedRewards],
  );

  const redeem = useCallback(
    (rewardId: string) => {
      const reward = rewards.find((r) => r.id === rewardId);
      if (!reward || reward.status !== "available") return;
      setRedeemedRewards((prev) => claimReward(prev, rewardId, new Date().toISOString()));
    },
    [rewards],
  );

  // Claimed rewards for Profile → My Rewards (newest first when a date is known).
  const claimedRewards = useMemo<ClaimedReward[]>(() => {
    return MOCK_REWARDS.filter((r) => redeemedRewards[r.id])
      .map((r) => ({ ...r, redeemedAt: redeemedRewards[r.id]?.redeemedAt }))
      .sort((a, b) => (b.redeemedAt ?? "").localeCompare(a.redeemedAt ?? ""));
  }, [redeemedRewards]);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const rows = [
      ...MOCK_LEADERBOARD_OTHERS.map((o) => ({ ...o, isCurrentUser: false })),
      {
        displayName: CURRENT_USER_NAME,
        points: summary.totalPoints,
        isCurrentUser: true,
        isDemoData: true as const,
      },
    ];
    rows.sort((a, b) => b.points - a.points);
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [summary.totalPoints]);

  return {
    challenges,
    progress,
    ledger,
    summary,
    leaderboard,
    badges,
    achievements,
    rewards,
    claimedRewards,
    join,
    setProgress,
    requestCompletion,
    verifyCompletion,
    awardQuiz,
    verifyVolunteering,
    redeem,
    reset,
  };
}

// Provides a single shared gamification state instance to the whole app, so
// Volunteer Nearby and Community Challenges read and update the same points,
// progress, verified-task count and reward state without reload-induced staleness.
export function GamificationProvider({ children }: { children: ReactNode }) {
  // Mount with key={userId} so persisted state is re-read for each user.
  const { userId } = useSession();
  const value = useGamificationState(userId);
  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): UseGamification {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error("useGamification must be used within a GamificationProvider");
  return ctx;
}
