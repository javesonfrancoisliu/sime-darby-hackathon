import { z } from "zod";
import { IsoDateTime } from "./common";

export const Township = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  securityLine: z.object({
    display: z.string().trim().min(1).max(40),
    tel: z.string().trim().min(3).max(20),
  }),
  emergencyNumber: z.string().trim().min(3).max(20),
  updatedAt: IsoDateTime,
});
export type Township = z.infer<typeof Township>;

export const PutTownshipBody = Township.omit({ id: true, updatedAt: true }).strict();
export type PutTownshipBody = z.infer<typeof PutTownshipBody>;
