import { z } from "zod";
import { IsoDateTime } from "./common";

// Dial strings only, so the value is safe to put in a tel: link.
const DialNumber = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[0-9+\-() ]+$/, "Use digits, spaces, + - ( ) only")
  .regex(/\d/, "Include at least one digit");

export const Township = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  securityLine: z.object({
    display: z.string().trim().min(1).max(40),
    tel: DialNumber,
  }),
  emergencyNumber: DialNumber,
  updatedAt: IsoDateTime,
});
export type Township = z.infer<typeof Township>;

export const PutTownshipBody = Township.omit({ id: true, updatedAt: true }).strict();
export type PutTownshipBody = z.infer<typeof PutTownshipBody>;
