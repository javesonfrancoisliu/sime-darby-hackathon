import { z } from "zod";
import { IsoDateTime } from "./common";

export const BloodGroup = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]);
export type BloodGroup = z.infer<typeof BloodGroup>;

// Malaysian mobile or landline, optional +60 and separators.
export const MALAYSIAN_PHONE = /^(?:\+?60|0)[\s-]?[1-9](?:[\s-]?\d){7,9}$/;

export const MedicalId = z.object({
  bloodGroup: BloodGroup,
  nextOfKinName: z.string().trim().min(1).max(80),
  nextOfKinRelation: z.string().trim().min(1).max(40),
  nextOfKinPhone: z.string().trim().regex(MALAYSIAN_PHONE, "Enter a Malaysian phone number"),
  updatedAt: IsoDateTime,
});
export type MedicalId = z.infer<typeof MedicalId>;

export const PutMedicalIdBody = MedicalId.omit({ updatedAt: true }).strict();
export type PutMedicalIdBody = z.infer<typeof PutMedicalIdBody>;
