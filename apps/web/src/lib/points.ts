import type {
  Achievement,
  Badge,
  GamificationSummary,
  PointsLedgerEntry,
  PointsSourceType,
} from "../types/gamification";

// Pure points-ledger logic. No React, no storage - kept side-effect free so it
// is trivially unit testable. The hook (useGamification) owns persistence.

// The canonical de-dupe identity for an award.
export function ledgerKey(sourceType: PointsSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

export type AwardInput = {
  sourceType: PointsSourceType;
  sourceId: string;
  points: number;
  label: string;
  // Shared key for the same real-world activity across source types.
  dedupeKey?: string;
  // Override for tests; defaults to now.
  awardedAt?: string;
};

// Returns true if awarding `input` would duplicate an existing entry - either
// the same (sourceType, sourceId) OR the same dedupeKey from another source
// (e.g. the same activity counted as both a challenge and a volunteering task).
export function isDuplicateAward(ledger: PointsLedgerEntry[], input: AwardInput): boolean {
  const sameSource = ledger.some(
    (e) => e.sourceType === input.sourceType && e.sourceId === input.sourceId,
  );
  if (sameSource) return true;
  if (input.dedupeKey == null) return false;
  return ledger.some((e) => e.dedupeKey != null && e.dedupeKey === input.dedupeKey);
}

// Returns a NEW ledger with the award appended, or the SAME ledger unchanged if
// it would be a duplicate. Never mutates the input.
export function awardPoints(ledger: PointsLedgerEntry[], input: AwardInput): PointsLedgerEntry[] {
  if (input.points <= 0) return ledger;
  if (isDuplicateAward(ledger, input)) return ledger;
  const entry: PointsLedgerEntry = {
    id: ledgerKey(input.sourceType, input.sourceId),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    dedupeKey: input.dedupeKey,
    points: input.points,
    label: input.label,
    awardedAt: input.awardedAt ?? new Date().toISOString(),
  };
  return [entry, ...ledger];
}

export function totalPoints(ledger: PointsLedgerEntry[]): number {
  return ledger.reduce((sum, e) => sum + e.points, 0);
}

export function countBySource(ledger: PointsLedgerEntry[], sourceType: PointsSourceType): number {
  return ledger.filter((e) => e.sourceType === sourceType).length;
}

// Derives the read-only summary used by the stats strip and reward gating.
//
// `verifiedVolunteerTaskCount` is passed in from a SEPARATE source of truth (the
// set of verified volunteering task ids), NOT derived from the ledger. This is
// deliberate: an activity that is both a challenge and a volunteering task is
// awarded points once (ledger de-dupe) but must still count as one volunteering
// task toward milestones - so the two counts are tracked independently.
export function summarize(
  ledger: PointsLedgerEntry[],
  badges: Badge[],
  achievements: Achievement[],
  verifiedVolunteerTaskCount = 0,
): GamificationSummary {
  const points = totalPoints(ledger);
  const completedChallenges = countBySource(ledger, "challenge");
  return {
    totalPoints: points,
    completedChallenges,
    completedVolunteerTasks: verifiedVolunteerTaskCount,
    earnedBadgeIds: badges.filter((b) => points >= b.threshold).map((b) => b.id),
    earnedAchievementIds: achievements
      .filter((a) => completedChallenges >= a.completedChallengesRequired)
      .map((a) => a.id),
    isDemoData: true,
  };
}
