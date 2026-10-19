import { z } from "zod";
import { IsoDateTime } from "./common";

export const FontSize = z.enum(["normal", "large", "xlarge"]);
export type FontSize = z.infer<typeof FontSize>;

export const Settings = z.object({
  notifyEvents: z.boolean(),
  notifyVolunteering: z.boolean(),
  shareApproxLocation: z.boolean(),
  fontSize: FontSize,
  highContrast: z.boolean(),
  reducedMotion: z.boolean(),
  voiceAssist: z.boolean(),
  updatedAt: IsoDateTime,
});
export type Settings = z.infer<typeof Settings>;

export const PutSettingsBody = Settings.omit({ updatedAt: true }).strict();
export type PutSettingsBody = z.infer<typeof PutSettingsBody>;

// What GET returns before the person has saved anything.
export const DEFAULT_SETTINGS: PutSettingsBody = {
  notifyEvents: true,
  notifyVolunteering: true,
  shareApproxLocation: false,
  fontSize: "normal",
  highContrast: false,
  reducedMotion: false,
  voiceAssist: false,
};
