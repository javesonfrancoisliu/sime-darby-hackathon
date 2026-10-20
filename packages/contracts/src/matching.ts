import { z } from "zod";
import { Area, Id } from "./common";

const MAX_SCORE = 100;
export const MAX_REASON_LENGTH = 240;

export const Match = z.object({
  volunteerId: Id,
  name: z.string(),
  area: Area,
  distanceKm: z.number().min(0),
  score: z.number().int().min(0).max(MAX_SCORE),
  reason: z.string().max(MAX_REASON_LENGTH),
});
export type Match = z.infer<typeof Match>;

export const MatchesResponse = z.object({
  rankedBy: z.enum(["ai", "rules"]),
  matches: z.array(Match),
});
export type MatchesResponse = z.infer<typeof MatchesResponse>;
