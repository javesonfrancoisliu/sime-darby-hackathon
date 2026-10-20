import { z } from "zod";
import { Id, IsoDateTime } from "./common";
import { Audience, IconKey } from "./icons";

export const VOUCHER_VALIDITY_DAYS = 30;
export function voucherExpiry(redeemedAt: string): string {
  return new Date(Date.parse(redeemedAt) + VOUCHER_VALIDITY_DAYS * 86400000).toISOString();
}

export const RewardCategory = z.enum(["shop", "clinic", "food", "recognition"]);
export type RewardCategory = z.infer<typeof RewardCategory>;

export const Reward = z.object({
  id: Id,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000),
  pointsCost: z.number().int().positive(),
  partner: z.string().trim().max(80).optional(),
  // Completed volunteer tasks needed before the reward unlocks.
  minVolunteerTasks: z.number().int().nonnegative().optional(),
  icon: IconKey,
  audience: Audience,
  category: RewardCategory,
  active: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Reward = z.infer<typeof Reward>;

export const RewardStatus = z.enum(["locked", "available", "redeemed"]);
export type RewardStatus = z.infer<typeof RewardStatus>;

export const RewardWithStatus = Reward.extend({
  status: RewardStatus,
  redeemedAt: IsoDateTime.optional(),
  usedAt: IsoDateTime.optional(),
  expiresAt: IsoDateTime.optional(),
});
export type RewardWithStatus = z.infer<typeof RewardWithStatus>;

export const RewardsResponse = z.object({ rewards: z.array(RewardWithStatus) });
export type RewardsResponse = z.infer<typeof RewardsResponse>;

export const CreateRewardBody = Reward.pick({
  title: true,
  pointsCost: true,
  partner: true,
  minVolunteerTasks: true,
  icon: true,
  category: true,
})
  .extend({
    description: Reward.shape.description.default(""),
    audience: Audience.default("all"),
    active: z.boolean().default(true),
  })
  .strict();
export type CreateRewardBody = z.infer<typeof CreateRewardBody>;

export const Redemption = z.object({
  rewardId: Id,
  title: z.string(),
  pointsSpent: z.number().int().positive(),
  redeemedAt: IsoDateTime,
  usedAt: IsoDateTime.optional(),
  expiresAt: IsoDateTime.optional(),
});
export type Redemption = z.infer<typeof Redemption>;

export const RedeemResult = z.object({
  redemption: Redemption,
  points: z.number().int().nonnegative(),
});
export type RedeemResult = z.infer<typeof RedeemResult>;
