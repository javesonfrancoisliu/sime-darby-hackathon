import type { RewardRedemption } from "../types/gamification";

// Pure, storage-agnostic reward-redemption helpers. Kept out of the React hook
// so they can be unit tested directly.

/**
 * Normalises persisted redemption state into the current record shape.
 *
 * Migration-safe: the old shape was a string[] of redeemed reward ids. Those are
 * converted to records WITHOUT a redeemedAt, so previously-claimed rewards are
 * preserved but never get an invented historical date. The new shape (a record)
 * is returned as-is. Anything unrecognised yields an empty record.
 */
export function normaliseRedemptions(raw: unknown): Record<string, RewardRedemption> {
  if (Array.isArray(raw)) {
    const migrated: Record<string, RewardRedemption> = {};
    for (const id of raw) if (typeof id === "string") migrated[id] = {};
    return migrated;
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, RewardRedemption>;
  }
  return {};
}

/**
 * Returns a new redemption record with `rewardId` claimed at `at`. Idempotent:
 * an already-claimed reward keeps its original record (no timestamp overwrite).
 */
export function claimReward(
  redemptions: Record<string, RewardRedemption>,
  rewardId: string,
  at: string,
): Record<string, RewardRedemption> {
  if (redemptions[rewardId]) return redemptions;
  return { ...redemptions, [rewardId]: { redeemedAt: at } };
}
