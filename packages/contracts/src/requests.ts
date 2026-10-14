import { z } from "zod";
import { Category, Id, IsoDateTime, Place } from "./common";

export const RequestStatus = z.enum([
  "pending_review",
  "open",
  "matched",
  "completed",
  "rejected",
  "cancelled",
]);
export type RequestStatus = z.infer<typeof RequestStatus>;

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 180;
const MAX_MINUTES_SPENT = 600;

const Title = z.string().trim().min(1).max(80);
const Description = z.string().trim().max(500);
const DurationMinutes = z.number().int().min(MIN_DURATION_MINUTES).max(MAX_DURATION_MINUTES);

export const HelpRequest = z.object({
  id: Id,
  elderId: Id,
  elderName: z.string(),
  category: Category,
  title: Title,
  description: Description,
  scheduledAt: IsoDateTime,
  durationMinutes: DurationMinutes,
  location: Place,
  status: RequestStatus,
  volunteerId: Id.optional(),
  volunteerName: z.string().optional(),
  reviewNote: z.string().optional(),
  minutesSpent: z.number().int().positive().optional(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type HelpRequest = z.infer<typeof HelpRequest>;

// What an uninvolved volunteer may see: no exact place and no elder identity.
export const HelpRequestSummary = HelpRequest.omit({
  location: true,
  elderId: true,
  elderName: true,
  volunteerId: true,
  volunteerName: true,
  reviewNote: true,
}).extend({
  area: z.string(),
  distanceKm: z.number().nonnegative(),
});
export type HelpRequestSummary = z.infer<typeof HelpRequestSummary>;

export const CreateRequestBody = z.object({
  category: Category,
  title: Title,
  description: Description.default(""),
  scheduledAt: IsoDateTime,
  durationMinutes: DurationMinutes,
  location: Place,
});
export type CreateRequestBody = z.infer<typeof CreateRequestBody>;

export const ReviewRequestBody = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(300).optional(),
});
export type ReviewRequestBody = z.infer<typeof ReviewRequestBody>;

export const CompleteRequestBody = z.object({
  minutesSpent: z.number().int().min(1).max(MAX_MINUTES_SPENT),
});
export type CompleteRequestBody = z.infer<typeof CompleteRequestBody>;

export const RequestsQuery = z.object({ status: RequestStatus.optional() });
export type RequestsQuery = z.infer<typeof RequestsQuery>;

export const RequestsResponse = z.object({ requests: z.array(HelpRequest) });
export type RequestsResponse = z.infer<typeof RequestsResponse>;
