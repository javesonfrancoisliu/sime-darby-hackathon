import { z } from "zod";
import { Area, Id, IsoDateTime } from "./common";

const Advice = z.string().trim().min(1).max(300);
const Unit = z.string().trim().min(1).max(20);

const ReadingBase = {
  area: Area,
  value: z.number(),
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
  normalMax: z.number(),
  ...ReadingBase,
});
export const HeatReading = z.object({
  type: z.literal("heat"),
  level: HeatLevel,
  feelsLike: z.number(),
  humidity: z.number().min(0).max(100),
  ...ReadingBase,
});

export const SafetyReading = z.discriminatedUnion("type", [AirReading, WaterReading, HeatReading]);
export type SafetyReading = z.infer<typeof SafetyReading>;
export const SafetyReadingType = z.enum(["air", "water", "heat"]);
export type SafetyReadingType = z.infer<typeof SafetyReadingType>;

// Upsert: the latest reading per type and area (water: per name) replaces the previous one.
export const PutSafetyReadingBody = SafetyReading;
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
