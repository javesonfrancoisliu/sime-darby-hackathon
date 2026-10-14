import { z } from "zod";
import { Category, IsoDateTime } from "./common";
import { CommunityEvent } from "./events";
import { HelpRequestSummary } from "./requests";

const MIN_RADIUS_KM = 0.5;
const MAX_RADIUS_KM = 20;

// Query strings arrive as text, so numbers and booleans are coerced here.
export const OpportunitiesQuery = z.object({
  // Whole 0.5 km steps, matching the precision of shared distances.
  radiusKm: z.coerce
    .number()
    .min(MIN_RADIUS_KM)
    .max(MAX_RADIUS_KM)
    .multipleOf(MIN_RADIUS_KM)
    .optional(),
  category: Category.optional(),
  from: IsoDateTime.optional(),
  to: IsoDateTime.optional(),
  fitsMySchedule: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});
export type OpportunitiesQuery = z.infer<typeof OpportunitiesQuery>;

const Scored = z.object({
  matchScore: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
});

export const Opportunity = z.discriminatedUnion("kind", [
  Scored.extend({ kind: z.literal("request"), request: HelpRequestSummary }),
  Scored.extend({ kind: z.literal("event"), event: CommunityEvent, distanceKm: z.number() }),
]);
export type Opportunity = z.infer<typeof Opportunity>;

export const OpportunitiesResponse = z.object({ items: z.array(Opportunity) });
export type OpportunitiesResponse = z.infer<typeof OpportunitiesResponse>;
