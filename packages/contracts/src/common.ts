import { z } from "zod";

export const Role = z.enum(["elder", "volunteer", "coordinator"]);
export type Role = z.infer<typeof Role>;

export const Category = z.enum([
  "groceries",
  "transport",
  "digital_literacy",
  "health_literacy",
  "home_help",
  "community_activity",
]);
export type Category = z.infer<typeof Category>;

export const Id = z.uuid();

export const Location = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Location = z.infer<typeof Location>;

export const Area = z.string().trim().min(1).max(80);

// Times are Malaysia local time (UTC+8), 24-hour HH:MM.
const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");

export const Day = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export type Day = z.infer<typeof Day>;

export const AvailabilitySlot = z
  .object({ day: Day, start: LocalTime, end: LocalTime })
  .refine((slot) => slot.start < slot.end, { message: "start must be before end" });
export type AvailabilitySlot = z.infer<typeof AvailabilitySlot>;

export const IsoDateTime = z.iso.datetime({ offset: true });
