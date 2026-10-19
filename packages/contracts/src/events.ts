import { z } from "zod";
import { Category, Id, IsoDateTime, Place } from "./common";

export const EventCategory = Category.extract([
  "community_activity",
  "health_literacy",
  "digital_literacy",
]);
export type EventCategory = z.infer<typeof EventCategory>;

export const EventPurpose = z.enum(["activity", "volunteer_drive"]);
export type EventPurpose = z.infer<typeof EventPurpose>;

export const EventStatus = z.enum(["upcoming", "completed"]);
export type EventStatus = z.infer<typeof EventStatus>;

// Named CommunityEvent to avoid clashing with the DOM Event type.
export const CommunityEvent = z.object({
  id: Id,
  title: z.string().trim().min(1).max(80),
  category: EventCategory,
  description: z.string().trim().max(1000),
  startsAt: IsoDateTime,
  durationMinutes: z.number().int().min(15).max(480),
  location: Place,
  capacity: z.number().int().min(1).max(500),
  signupCount: z.number().int().nonnegative(),
  status: EventStatus,
  purpose: EventPurpose.default("activity"),
  organiser: z.string().trim().max(80).default(""),
  createdBy: Id,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  // Present only when the caller is signed in.
  joined: z.boolean().optional(),
});
export type CommunityEvent = z.infer<typeof CommunityEvent>;

export const CreateEventBody = CommunityEvent.pick({
  title: true,
  category: true,
  startsAt: true,
  durationMinutes: true,
  location: true,
  capacity: true,
  purpose: true,
  organiser: true,
}).extend({ description: CommunityEvent.shape.description.default("") });
export type CreateEventBody = z.infer<typeof CreateEventBody>;

export const EventsResponse = z.object({ events: z.array(CommunityEvent) });
export type EventsResponse = z.infer<typeof EventsResponse>;

export const EventsQuery = z.object({ purpose: EventPurpose.optional() });
export type EventsQuery = z.infer<typeof EventsQuery>;
