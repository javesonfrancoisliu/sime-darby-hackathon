import { z } from "zod";
import { Area, Id, IsoDateTime } from "./common";

const Advice = z.string().trim().min(1).max(300);
const Unit = z.string().trim().min(1).max(20);

// Readings are stored as DynamoDB numbers, which cannot hold huge or denormal values.
export const MAX_READING_VALUE = 100_000;
const MIN_READING_MAGNITUDE = 1e-6;
const MIN_FEELS_LIKE_C = -60;
const MAX_FEELS_LIKE_C = 80;
// How far ahead of the server clock a measurement time may be, for device clock skew.
export const MAX_FUTURE_READING_MS = 24 * 60 * 60 * 1000;

const bounded = (min: number, max: number) =>
  z
    .number()
    .min(min)
    .max(max)
    .refine((n) => n === 0 || Math.abs(n) >= MIN_READING_MAGNITUDE, "Too close to zero");
const Measure = bounded(0, MAX_READING_VALUE);

const ReadingBase = {
  area: Area,
  value: Measure,
  unit: Unit,
  advice: Advice,
  measuredAt: IsoDateTime,
};

export const AirLevel = z.enum(["good", "moderate", "unhealthy", "hazardous"]);
export const WaterLevel = z.enum(["normal", "watch", "warning", "danger"]);
export const HeatLevel = z.enum(["normal", "warning", "danger"]);
export type AirLevel = z.infer<typeof AirLevel>;
export type WaterLevel = z.infer<typeof WaterLevel>;
export type HeatLevel = z.infer<typeof HeatLevel>;

export const WaterBody = z.enum(["river", "lake"]);
export type WaterBody = z.infer<typeof WaterBody>;

export const AirReading = z.object({ type: z.literal("air"), level: AirLevel, ...ReadingBase });
export const WaterReading = z.object({
  type: z.literal("water"),
  level: WaterLevel,
  name: z.string().trim().min(1).max(80),
  waterBody: WaterBody,
  normalMax: Measure,
  ...ReadingBase,
});
export const HeatReading = z.object({
  type: z.literal("heat"),
  level: HeatLevel,
  feelsLike: bounded(MIN_FEELS_LIKE_C, MAX_FEELS_LIKE_C),
  humidity: bounded(0, 100),
  ...ReadingBase,
});

export const SafetyReading = z.discriminatedUnion("type", [AirReading, WaterReading, HeatReading]);
export type SafetyReading = z.infer<typeof SafetyReading>;
export const SafetyReadingType = z.enum(["air", "water", "heat"]);
export type SafetyReadingType = z.infer<typeof SafetyReadingType>;

// Upsert: the latest reading per type and area (water: per name) replaces the previous one.
export const PutSafetyReadingBody = SafetyReading.refine(
  (reading) => Date.parse(reading.measuredAt) <= Date.now() + MAX_FUTURE_READING_MS,
  { message: "measuredAt cannot be more than a day in the future", path: ["measuredAt"] },
);
export type PutSafetyReadingBody = SafetyReading;

export const FacilityStatus = z.enum(["reported", "in_progress", "resolved"]);
export type FacilityStatus = z.infer<typeof FacilityStatus>;

export const FacilityReport = z.object({
  id: Id,
  title: z.string().trim().min(1).max(120),
  area: Area,
  category: z.string().trim().min(1).max(40),
  status: FacilityStatus,
  description: z.string().trim().max(1000),
  reportedAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type FacilityReport = z.infer<typeof FacilityReport>;

export const CreateFacilityReportBody = FacilityReport.pick({
  title: true,
  area: true,
  category: true,
})
  .extend({ description: FacilityReport.shape.description.default("") })
  .strict();
export type CreateFacilityReportBody = z.infer<typeof CreateFacilityReportBody>;

export const PatchFacilityReportBody = FacilityReport.pick({
  status: true,
  title: true,
  description: true,
})
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });
export type PatchFacilityReportBody = z.infer<typeof PatchFacilityReportBody>;

export const SafetyResponse = z.object({
  readings: z.array(SafetyReading),
  facilityReports: z.array(FacilityReport),
});
export type SafetyResponse = z.infer<typeof SafetyResponse>;
