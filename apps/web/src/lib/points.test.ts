import { describe, expect, it } from "vitest";

import type { Achievement, Badge, PointsLedgerEntry } from "../types/gamification";
import { awardPoints, isDuplicateAward, ledgerKey, summarize, totalPoints } from "./points";

const AT = "2026-10-20T00:00:00+08:00";

const challengeAward = (id: string, points = 50, dedupeKey?: string) => ({
  sourceType: "challenge" as const,
  sourceId: id,
  points,
  label: `Challenge ${id}`,
  dedupeKey,
  awardedAt: AT,
});

describe("awardPoints", () => {
  it("appends a new award and does not mutate the input", () => {
    const start: PointsLedgerEntry[] = [];
    const next = awardPoints(start, challengeAward("a"));
    expect(next).toHaveLength(1);
    expect(start).toHaveLength(0);
    expect(next[0]?.points).toBe(50);
    expect(next[0]?.id).toBe(ledgerKey("challenge", "a"));
  });

  it("ignores non-positive awards", () => {
    expect(awardPoints([], challengeAward("a", 0))).toHaveLength(0);
    expect(awardPoints([], challengeAward("a", -10))).toHaveLength(0);
  });

  it("prevents duplicate awards for the same (sourceType, sourceId)", () => {
    const once = awardPoints([], challengeAward("a"));
    const twice = awardPoints(once, challengeAward("a"));
    expect(twice).toHaveLength(1);
    expect(totalPoints(twice)).toBe(50);
  });

  it("allows the same sourceId under a different sourceType", () => {
    const ledger = awardPoints(
      awardPoints([], challengeAward("x")),
      { sourceType: "volunteering", sourceId: "x", points: 20, label: "Vol x", awardedAt: AT },
    );
    expect(ledger).toHaveLength(2);
  });
});

describe("cross-source de-duplication via dedupeKey", () => {
  const SHARED = "activity:cleanup-2026-10-24";

  it("does not award the same activity twice across challenge and volunteering", () => {
    // Awarded first as a completed challenge.
    const afterChallenge = awardPoints([], challengeAward("chl-cleanup", 80, SHARED));
    // The same real activity also arrives as a verified volunteering contribution.
    const afterVolunteering = awardPoints(afterChallenge, {
      sourceType: "volunteering",
      sourceId: "contrib-123",
      points: 80,
      label: "Clean-up contribution",
      dedupeKey: SHARED,
      awardedAt: AT,
    });
    expect(afterVolunteering).toHaveLength(1);
    expect(totalPoints(afterVolunteering)).toBe(80);
  });

  it("isDuplicateAward detects a shared dedupeKey from another source", () => {
    const ledger = awardPoints([], challengeAward("chl", 80, SHARED));
    expect(
      isDuplicateAward(ledger, {
        sourceType: "volunteering",
        sourceId: "other",
        points: 80,
        label: "x",
        dedupeKey: SHARED,
      }),
    ).toBe(true);
  });

  it("treats awards without a dedupeKey independently", () => {
    const ledger = awardPoints([], challengeAward("a", 50));
    expect(
      isDuplicateAward(ledger, {
        sourceType: "volunteering",
        sourceId: "b",
        points: 50,
        label: "x",
      }),
    ).toBe(false);
  });
});

describe("shared activity: points once, but counted as one volunteering task", () => {
  const SHARED = "activity:cleanup-central-green-2026-10-24";
  const badges: Badge[] = [];
  const achievements: Achievement[] = [];

  // Mirrors the hook: points go through the de-duping ledger; the verified
  // volunteering TASK count is a separate id set. This proves the clean-up that
  // is both a challenge and a volunteering task is paid once yet still counts as
  // one volunteering task toward milestones.

  it("challenge completed first, then volunteering verified", () => {
    const verifiedTaskIds = new Set<string>();

    // 1. Challenge completes → points awarded, dedupeKey set.
    let ledger = awardPoints([], {
      sourceType: "challenge",
      sourceId: "chl-cleanup",
      points: 80,
      label: "Clean-up challenge",
      dedupeKey: SHARED,
      awardedAt: AT,
    });

    // 2. Same activity verified as a volunteering task: record the task id
    //    (separate set) AND attempt a points award (de-duped by dedupeKey).
    verifiedTaskIds.add("task-cleanup");
    ledger = awardPoints(ledger, {
      sourceType: "volunteering",
      sourceId: "task-cleanup",
      points: 80,
      label: "Clean-up volunteering",
      dedupeKey: SHARED,
      awardedAt: AT,
    });

    expect(totalPoints(ledger)).toBe(80); // paid ONCE
    const summary = summarize(ledger, badges, achievements, verifiedTaskIds.size);
    expect(summary.completedVolunteerTasks).toBe(1); // still counts as one task
  });

  it("volunteering verified first, then challenge completed", () => {
    const verifiedTaskIds = new Set<string>();

    // 1. Volunteering verified first.
    verifiedTaskIds.add("task-cleanup");
    let ledger = awardPoints([], {
      sourceType: "volunteering",
      sourceId: "task-cleanup",
      points: 80,
      label: "Clean-up volunteering",
      dedupeKey: SHARED,
      awardedAt: AT,
    });

    // 2. Then the challenge completes for the same activity.
    ledger = awardPoints(ledger, {
      sourceType: "challenge",
      sourceId: "chl-cleanup",
      points: 80,
      label: "Clean-up challenge",
      dedupeKey: SHARED,
      awardedAt: AT,
    });

    expect(totalPoints(ledger)).toBe(80); // still paid ONCE
    const summary = summarize(ledger, badges, achievements, verifiedTaskIds.size);
    expect(summary.completedVolunteerTasks).toBe(1);
  });

  it("two DIFFERENT volunteering tasks each count and each pay", () => {
    const verifiedTaskIds = new Set<string>(["task-a", "task-b"]);
    let ledger = awardPoints([], {
      sourceType: "volunteering",
      sourceId: "task-a",
      points: 30,
      label: "A",
      awardedAt: AT,
    });
    ledger = awardPoints(ledger, {
      sourceType: "volunteering",
      sourceId: "task-b",
      points: 30,
      label: "B",
      awardedAt: AT,
    });
    expect(totalPoints(ledger)).toBe(60);
    expect(summarize(ledger, badges, achievements, verifiedTaskIds.size).completedVolunteerTasks).toBe(2);
  });
});

describe("summarize", () => {
  const badges: Badge[] = [
    { id: "b30", label: "30", description: "", icon: "", threshold: 30, isDemoData: true },
    { id: "b100", label: "100", description: "", icon: "", threshold: 100, isDemoData: true },
  ];
  const achievements: Achievement[] = [
    {
      id: "a1",
      label: "1",
      description: "",
      completedChallengesRequired: 1,
      isDemoData: true,
    },
    {
      id: "a3",
      label: "3",
      description: "",
      completedChallengesRequired: 3,
      isDemoData: true,
    },
  ];

  it("totals points, counts challenge completions, and derives earned badges/achievements", () => {
    let ledger: PointsLedgerEntry[] = [];
    ledger = awardPoints(ledger, challengeAward("c1", 50));
    ledger = awardPoints(ledger, challengeAward("c2", 40));
    ledger = awardPoints(ledger, {
      sourceType: "volunteering",
      sourceId: "v1",
      points: 20,
      label: "Vol",
      awardedAt: AT,
    });

    // verifiedVolunteerTaskCount is passed separately (not derived from ledger).
    const summary = summarize(ledger, badges, achievements, 1);
    expect(summary.totalPoints).toBe(110);
    expect(summary.completedChallenges).toBe(2);
    expect(summary.completedVolunteerTasks).toBe(1);
    expect(summary.earnedBadgeIds).toEqual(["b30", "b100"]);
    expect(summary.earnedAchievementIds).toEqual(["a1"]); // 2 completed, not 3
  });

  it("earns no badges when below the first threshold", () => {
    const ledger = awardPoints([], challengeAward("c1", 10));
    expect(summarize(ledger, badges, achievements, 0).earnedBadgeIds).toEqual([]);
  });

  it("post-reset (empty ledger + zero tasks) yields a fully zeroed summary", () => {
    // Mirrors the state useGamification.reset() restores.
    const summary = summarize([], badges, achievements, 0);
    expect(summary.totalPoints).toBe(0);
    expect(summary.completedChallenges).toBe(0);
    expect(summary.completedVolunteerTasks).toBe(0);
    expect(summary.earnedBadgeIds).toEqual([]);
    expect(summary.earnedAchievementIds).toEqual([]);
  });

  it("volunteer task count comes from the separate argument, not the ledger", () => {
    // Ledger has no volunteering entry, but 2 tasks were verified separately.
    const ledger = awardPoints([], challengeAward("c1", 50));
    expect(summarize(ledger, badges, achievements, 2).completedVolunteerTasks).toBe(2);
  });
});
