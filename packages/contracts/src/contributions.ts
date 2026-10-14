import { z } from "zod";
import { Id, IsoDateTime } from "./common";

export const Contribution = z.object({
  id: Id,
  volunteerId: Id,
  source: z.enum(["request", "event"]),
  sourceId: Id,
  title: z.string(),
  minutes: z.number().int().positive(),
  completedAt: IsoDateTime,
});
export type Contribution = z.infer<typeof Contribution>;

export const ContributionsResponse = z.object({
  totalMinutes: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  items: z.array(Contribution),
});
export type ContributionsResponse = z.infer<typeof ContributionsResponse>;
