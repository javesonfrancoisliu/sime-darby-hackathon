import { z } from "zod";
import { Id, IsoDateTime } from "./common";
import { Audience, IconKey } from "./icons";
import { Precinct } from "./users";

export const ChallengeMode = z.enum(["team", "individual"]);
export type ChallengeMode = z.infer<typeof ChallengeMode>;

export const ChallengeCategory = z.enum(["fitness", "cleanup", "environment", "community"]);
export type ChallengeCategory = z.infer<typeof ChallengeCategory>;

export const GoalType = z.enum(["steps", "sessions", "quiz", "count"]);
export type GoalType = z.infer<typeof GoalType>;

export const ChallengeGoal = z.object({
  target: z.number().int().positive(),
  unit: z.string().trim().min(1).max(30),
  type: GoalType,
});
export type ChallengeGoal = z.infer<typeof ChallengeGoal>;

export const Challenge = z.object({
  id: Id,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000),
  icon: IconKey,
  category: ChallengeCategory,
  mode: ChallengeMode,
  audience: Audience,
  goal: ChallengeGoal,
  // Individual challenges: points awarded on completion.
  points: z.number().int().nonnegative(),
  // Team challenges: display-only reward text.
  teamReward: z.string().trim().max(200).optional(),
  requiresVerification: z.boolean(),
  quizId: Id.optional(),
  relatedEventId: Id.optional(),
  endsOn: IsoDateTime,
  createdBy: Id,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Challenge = z.infer<typeof Challenge>;

export const ProgressStatus = z.enum(["in_progress", "pending_verification", "completed"]);
export type ProgressStatus = z.infer<typeof ProgressStatus>;

export const ChallengeProgress = z.object({
  challengeId: Id,
  status: ProgressStatus,
  current: z.number().int().nonnegative(),
  joinedAt: IsoDateTime,
  completedAt: IsoDateTime.optional(),
});
export type ChallengeProgress = z.infer<typeof ChallengeProgress>;

// Team = precinct: the caller's precinct total towards the goal.
export const TeamProgress = z.object({
  precinct: Precinct,
  current: z.number().int().nonnegative(),
});
export type TeamProgress = z.infer<typeof TeamProgress>;

export const ChallengeWithProgress = Challenge.extend({
  // Derived from endsOn at read time; never stored.
  ended: z.boolean(),
  progress: ChallengeProgress.optional(),
  teamProgress: TeamProgress.optional(),
});
export type ChallengeWithProgress = z.infer<typeof ChallengeWithProgress>;

export const ChallengesQuery = z.object({ audience: Audience.optional() });
export type ChallengesQuery = z.infer<typeof ChallengesQuery>;

export const ChallengesResponse = z.object({ challenges: z.array(ChallengeWithProgress) });
export type ChallengesResponse = z.infer<typeof ChallengesResponse>;

// Upper bounds on what a coordinator can set, so a typo cannot mint a huge payout.
export const MAX_CHALLENGE_POINTS = 1000;

export const CreateChallengeBody = Challenge.pick({
  title: true,
  icon: true,
  category: true,
  mode: true,
  goal: true,
  teamReward: true,
  quizId: true,
  relatedEventId: true,
  endsOn: true,
})
  .extend({
    description: Challenge.shape.description.default(""),
    audience: Audience.default("all"),
    points: Challenge.shape.points.max(MAX_CHALLENGE_POINTS).default(0),
    requiresVerification: z.boolean().default(false),
  })
  .strict();
export type CreateChallengeBody = z.infer<typeof CreateChallengeBody>;

// Self-reported; the service clamps current to goal.target.
export const ChallengeProgressBody = z.object({ current: z.number().int().nonnegative() }).strict();
export type ChallengeProgressBody = z.infer<typeof ChallengeProgressBody>;

export const PendingVerification = z.object({
  userId: Id,
  displayName: z.string(),
  current: z.number().int().nonnegative(),
  requestedAt: IsoDateTime,
});
export type PendingVerification = z.infer<typeof PendingVerification>;

export const PendingVerificationsResponse = z.object({ pending: z.array(PendingVerification) });
export type PendingVerificationsResponse = z.infer<typeof PendingVerificationsResponse>;

// Result of join, progress, complete and verify: the caller's updated progress and any award.
export const ChallengeActionResult = z.object({
  progress: ChallengeProgress,
  pointsAwarded: z.number().int().nonnegative(),
});
export type ChallengeActionResult = z.infer<typeof ChallengeActionResult>;

export const ContributeResult = z.object({
  teamProgress: TeamProgress,
  pointsAwarded: z.number().int().nonnegative(),
});
export type ContributeResult = z.infer<typeof ContributeResult>;
