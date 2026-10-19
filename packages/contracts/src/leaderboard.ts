import { z } from "zod";

export const LeaderboardEntry = z.object({
  rank: z.number().int().positive(),
  // First name plus last initial.
  displayName: z.string(),
  lifetimePoints: z.number().int().nonnegative(),
  isCurrentUser: z.boolean(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntry>;

export const LeaderboardResponse = z.object({
  entries: z.array(LeaderboardEntry),
  // The caller's own row when opted in, even outside the top entries.
  me: LeaderboardEntry.optional(),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponse>;
