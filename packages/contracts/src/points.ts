import { z } from "zod";
import { IsoDateTime } from "./common";
import { Paged } from "./paging";

export const PointsSourceType = z.enum([
  "challenge",
  "volunteering",
  "quiz",
  "check_in",
  "team_contribution",
  "redemption",
]);
export type PointsSourceType = z.infer<typeof PointsSourceType>;

export const PointsLedgerEntry = z.object({
  awardKey: z.string(),
  sourceType: PointsSourceType,
  sourceId: z.string(),
  // Negative for a redemption.
  points: z.number().int(),
  title: z.string(),
  awardedAt: IsoDateTime,
});
export type PointsLedgerEntry = z.infer<typeof PointsLedgerEntry>;

export const PointsSummary = z.object({
  // Spendable balance.
  points: z.number().int().nonnegative(),
  // Only positive awards add; drives badges and the leaderboard.
  lifetimePoints: z.number().int().nonnegative(),
  ledger: Paged(PointsLedgerEntry),
});
export type PointsSummary = z.infer<typeof PointsSummary>;

const KL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const Streak = z.object({
  current: z.number().int().nonnegative(),
  best: z.number().int().nonnegative(),
  // YYYY-MM-DD in Malaysia time.
  lastCheckInDate: z.string().regex(KL_DATE).optional(),
  // Up to the last 7 check-in dates, oldest first.
  recent: z.array(z.string().regex(KL_DATE)).max(7),
});
export type Streak = z.infer<typeof Streak>;

export const CheckInResult = z.object({
  streak: Streak,
  pointsAwarded: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
});
export type CheckInResult = z.infer<typeof CheckInResult>;
