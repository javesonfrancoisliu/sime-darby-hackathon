import { z } from "zod";
import { Id, IsoDateTime } from "./common";
import { Audience, IconKey } from "./icons";

// points: earned at lifetimePoints >= threshold; challenges: at completed challenges >= threshold.
export const BadgeKind = z.enum(["points", "challenges"]);
export type BadgeKind = z.infer<typeof BadgeKind>;

export const Badge = z.object({
  id: Id,
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
  icon: IconKey,
  kind: BadgeKind,
  threshold: z.number().int().positive(),
  audience: Audience,
  createdAt: IsoDateTime,
});
export type Badge = z.infer<typeof Badge>;

export const BadgeWithEarned = Badge.extend({ earned: z.boolean() });
export type BadgeWithEarned = z.infer<typeof BadgeWithEarned>;

export const BadgesResponse = z.object({ badges: z.array(BadgeWithEarned) });
export type BadgesResponse = z.infer<typeof BadgesResponse>;

export const CreateBadgeBody = Badge.pick({
  title: true,
  icon: true,
  kind: true,
  threshold: true,
})
  .extend({
    description: Badge.shape.description.default(""),
    audience: Audience.default("all"),
  })
  .strict();
export type CreateBadgeBody = z.infer<typeof CreateBadgeBody>;
