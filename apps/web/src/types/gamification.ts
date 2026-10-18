// Gamified Community Challenges - frontend view models (Young role).
// All data built from these types is simulated/demo for the hackathon prototype
// and must be labelled as such in the UI. No backend or shared-contract changes.
//
// Points are awarded ONLY on verified completion (a challenge's verification step
// or a verified volunteering contribution) - never on joining. The points ledger
// prevents duplicate awards, including the case where one underlying activity
// surfaces both as a Challenge and as a Help-a-Neighbour contribution.

export type ChallengeCategory = "fitness" | "cleanup" | "environment";

export type ChallengeStatus =
  | "available" // not yet joined
  | "in_progress" // joined; logging progress
  | "pending_verification" // progress complete; awaiting the simulated verify step
  | "completed"; // verified; points awarded

// How a challenge measures progress.
export type ChallengeGoalType = "steps" | "sessions" | "quiz";

export type Challenge = {
  id: string;
  title: string;
  summary: string;
  category: ChallengeCategory;
  // Points granted once verified-complete.
  points: number;
  goal: {
    type: ChallengeGoalType;
    // Target to reach, e.g. 20000 steps, 3 sessions, 3 correct quiz answers.
    target: number;
    unit: string; // "steps", "sessions", "correct answers"
  };
  // Whether completion needs the simulated verification step before points.
  // Clean-up challenges require it (verified participation); a self-paced
  // walking goal may not.
  requiresVerification: boolean;
  // Optional link to an existing community event, so challenges reference
  // existing activities rather than duplicating event data.
  relatedEventId?: string;
  // Stable key for the underlying real-world activity. When a challenge and a
  // volunteering contribution describe the SAME activity, they share this key so
  // the ledger awards points once. Omitted for purely self-paced challenges.
  dedupeKey?: string;
  isDemoData: true;
};

// A user's live progress on a joined challenge (client-only demo state).
export type ChallengeProgress = {
  challengeId: string;
  status: ChallengeStatus;
  // Current progress value toward goal.target (self-reported / simulated).
  current: number;
  joinedAt: string;
  completedAt?: string;
};

// ---- Gamification rewards layer ----

export type Badge = {
  id: string;
  label: string;
  description: string;
  // lucide-react icon name resolved in the UI layer.
  icon: string;
  // Points needed to earn this badge.
  threshold: number;
  isDemoData: true;
};

export type Achievement = {
  id: string;
  label: string;
  description: string;
  // Earned when this many challenges are completed.
  completedChallengesRequired: number;
  isDemoData: true;
};

export type RewardStatus = "locked" | "available" | "redeemed";

// Per-reward redemption record. Keyed by reward id in the provider. `redeemedAt`
// is a frontend-only timestamp set at simulated redemption time; it is optional
// so rewards redeemed before this model existed migrate without inventing a date.
export type RewardRedemption = {
  redeemedAt?: string; // ISO 8601, when known
};

export type Reward = {
  id: string;
  label: string;
  description: string;
  // Points needed to unlock.
  pointsCost: number;
  // Optional additional gate: minimum verified volunteering tasks completed.
  // Supports reward milestones based on volunteering counts, not just points.
  minVolunteerTasks?: number;
  isDemoData: true;
};

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  points: number;
  isCurrentUser: boolean;
  isDemoData: true;
};

// ---- Points ledger (the anti-double-count core) ----

// What produced a points award.
export type PointsSourceType = "challenge" | "volunteering" | "quiz";

export type PointsLedgerEntry = {
  id: string;
  sourceType: PointsSourceType;
  // Unique id within the source type (challenge id, contribution id, quiz id).
  sourceId: string;
  // Shared de-dupe key for the same underlying activity across source types.
  // When present, two entries with the same dedupeKey are never both awarded.
  dedupeKey?: string;
  points: number;
  label: string;
  awardedAt: string;
};

// Derived, read-only summary for the stats strip and reward gating.
export type GamificationSummary = {
  totalPoints: number;
  completedChallenges: number;
  // Count of distinct VERIFIED volunteering activities. Tracked independently of
  // the points ledger so that an activity which also exists as a challenge is
  // paid points once but still counts as one volunteering task toward milestones.
  completedVolunteerTasks: number;
  earnedBadgeIds: string[];
  earnedAchievementIds: string[];
  isDemoData: true;
};

export const CHALLENGE_CATEGORY_LABEL: Record<ChallengeCategory, string> = {
  fitness: "Fitness",
  cleanup: "Clean-up",
  environment: "Environment",
};
