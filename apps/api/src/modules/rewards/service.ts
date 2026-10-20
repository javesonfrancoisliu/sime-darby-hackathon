import { randomUUID } from "node:crypto";
import type {
  CreateRewardBody,
  RedeemResult,
  Reward,
  RewardWithStatus,
  Redemption,
  User,
} from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { nowIso } from "../../lib/time";
import { listContributions } from "../contributions/repository";
import { redeem } from "../points/service";
import { getUser } from "../users/repository";
import {
  getReward,
  getRedemption,
  listRedemptions,
  listRewards,
  putReward,
  useRedemption,
} from "./repository";

const visibleTo = (user: User, reward: Reward): boolean =>
  user.role === "coordinator" ||
  (reward.active && (reward.audience === "all" || reward.audience === user.role));

const unlocked = (user: User, reward: Reward, completedTasks: number): boolean =>
  user.points >= reward.pointsCost && completedTasks >= (reward.minVolunteerTasks ?? 0);

export async function createReward(body: CreateRewardBody): Promise<Reward> {
  const now = nowIso();
  const reward: Reward = { ...body, id: randomUUID(), createdAt: now, updatedAt: now };
  await putReward(reward);
  return reward;
}

export async function listFor(user: User): Promise<RewardWithStatus[]> {
  const [rewards, redemptions, contributions] = await Promise.all([
    listRewards(),
    listRedemptions(user.id),
    listContributions(user.id),
  ]);
  const redeemedAt = new Map(redemptions.map((r) => [r.rewardId, r]));
  return rewards
    .filter((reward) => visibleTo(user, reward) || redeemedAt.has(reward.id))
    .map((reward): RewardWithStatus => {
      const when = redeemedAt.get(reward.id);
      if (when)
        return {
          ...reward,
          status: "redeemed",
          redeemedAt: when.redeemedAt,
          expiresAt: when.expiresAt,
          ...(when.usedAt ? { usedAt: when.usedAt } : {}),
        };
      return {
        ...reward,
        status: unlocked(user, reward, contributions.length) ? "available" : "locked",
      };
    });
}

export async function redeemReward(user: User, id: string): Promise<RedeemResult> {
  const reward = await getReward(id);
  if (!reward || !visibleTo(user, reward)) throw new HttpError("NOT_FOUND", "Reward not found");
  const required = reward.minVolunteerTasks ?? 0;
  if (required > 0) {
    const done = (await listContributions(user.id)).length;
    if (done < required) {
      throw new HttpError(
        "FORBIDDEN",
        `Complete ${required} volunteer tasks to unlock this reward`,
      );
    }
  }
  const outcome = await redeem(user.id, reward);
  if (outcome === "already_redeemed") throw new HttpError("ALREADY_DONE", "Already redeemed");
  if (outcome === "insufficient_points") {
    throw new HttpError("INSUFFICIENT_POINTS", "Not enough points");
  }
  if (outcome === "reward_unavailable") throw new HttpError("NOT_FOUND", "Reward not found");
  if (outcome === "conflict") throw new HttpError("CONFLICT_RETRY", "Try again");
  const [redemption, fresh] = await Promise.all([getRedemption(user.id, id), getUser(user.id)]);
  if (!redemption || !fresh) throw new HttpError("INTERNAL", "Redemption was not recorded");
  return { redemption, points: fresh.points };
}

export async function useReward(user: User, id: string): Promise<Redemption> {
  const existing = await getRedemption(user.id, id);
  if (!existing) throw new HttpError("NOT_FOUND", "Redeem this voucher before using it");
  if (existing.usedAt) return existing;
  const now = nowIso();
  if (existing.expiresAt && Date.parse(existing.expiresAt) <= Date.parse(now)) {
    throw new HttpError("CONFLICT", "This voucher has expired");
  }
  const redemption = await useRedemption(user.id, id, now);
  if (!redemption?.usedAt) throw new HttpError("CONFLICT", "This voucher has expired");
  return redemption;
}
