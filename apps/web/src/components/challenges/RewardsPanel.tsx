import { CloudOff, Gift } from "lucide-react";

import type { RewardWithStatus } from "@sdh/contracts";

import { ICON_BY_KEY } from "../../lib/icons";
import { AppButton, EmptyState, InfoCard, LoadingState } from "../ui";

export type RewardsPanelProps = {
  rewards: RewardWithStatus[];
  // The person's current points, to say how far a locked reward is.
  balance: number;
  loading: boolean;
  error: string | null;
  // The id of the reward being redeemed.
  redeemingId: string | null;
  onRedeem: (reward: RewardWithStatus) => void;
};

// Why a locked reward is out of reach, in plain words.
function lockHint(reward: RewardWithStatus, balance: number): string {
  if (reward.pointsCost > balance) {
    const short = reward.pointsCost - balance;
    return `${short} more ${short === 1 ? "point" : "points"} needed`;
  }
  if (reward.minVolunteerTasks) {
    return `Complete ${reward.minVolunteerTasks} volunteer tasks to unlock`;
  }
  return "Not available yet";
}

// Cheapest first, so the next reward within reach is at the top.
const byCost = (a: RewardWithStatus, b: RewardWithStatus) => a.pointsCost - b.pointsCost;

// Rewards and redemption status. Redeeming spends points.
export function RewardsPanel({
  rewards,
  balance,
  loading,
  error,
  redeemingId,
  onRedeem,
}: RewardsPanelProps) {
  return (
    <div className="ui-stack">
      {loading ? (
        <LoadingState rows={2} label="Loading rewards" />
      ) : error ? (
        <InfoCard>
          <EmptyState icon={CloudOff} title="Couldn't load rewards" description={error} />
        </InfoCard>
      ) : rewards.length === 0 ? (
        <InfoCard>
          <EmptyState
            icon={Gift}
            title="No rewards yet"
            description="New rewards will show up here."
          />
        </InfoCard>
      ) : (
        <ul className="community-list ui-stack">
          {[...rewards].sort(byCost).map((reward) => {
            const Icon = ICON_BY_KEY[reward.icon];
            return (
              <InfoCard as="li" key={reward.id} ariaLabel={`Reward: ${reward.title}`}>
                <div className="reward-card">
                  <Icon className="reward-card__icon" size={26} aria-hidden="true" />
                  <div className="reward-card__info">
                    <h3>{reward.title}</h3>
                    {reward.partner && <p>{reward.partner}</p>}
                    {reward.status === "locked" && (
                      <p className="reward-lock-hint">{lockHint(reward, balance)}</p>
                    )}
                  </div>
                  <div className="reward-card__action">
                    <span className="reward-card__points">{reward.pointsCost} pts</span>
                    <AppButton
                      variant={reward.status === "available" ? "primary" : "secondary"}
                      disabled={reward.status !== "available"}
                      loading={redeemingId === reward.id}
                      aria-label={
                        reward.status === "available"
                          ? `Redeem ${reward.title} for ${reward.pointsCost} pts`
                          : `${reward.title}: ${reward.status}`
                      }
                      onClick={() => onRedeem(reward)}
                    >
                      {reward.status === "redeemed"
                        ? "Redeemed"
                        : reward.status === "locked"
                          ? "Locked"
                          : "Redeem"}
                    </AppButton>
                  </div>
                </div>
              </InfoCard>
            );
          })}
        </ul>
      )}
    </div>
  );
}
