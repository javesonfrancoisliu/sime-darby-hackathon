import { CloudOff, Gift } from "lucide-react";

import type { RewardWithStatus } from "@sdh/contracts";

import { ICON_BY_KEY } from "../../lib/icons";
import { AppButton, EmptyState, InfoCard, LoadingState } from "../ui";

export type RewardsPanelProps = {
  rewards: RewardWithStatus[];
  loading: boolean;
  error: string | null;
  // The id of the reward being redeemed.
  redeemingId: string | null;
  onRedeem: (reward: RewardWithStatus) => void;
};

// Rewards and redemption status. Redeeming spends points.
export function RewardsPanel({
  rewards,
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
          {rewards.map((reward) => {
            const Icon = ICON_BY_KEY[reward.icon];
            return (
              <InfoCard as="li" key={reward.id} ariaLabel={`Reward: ${reward.title}`}>
                <div className="reward-card">
                  <Icon className="reward-card__icon" size={26} aria-hidden="true" />
                  <div className="reward-card__info">
                    <h3>{reward.title}</h3>
                    {reward.partner && <p>{reward.partner}</p>}
                  </div>
                  <div className="reward-card__action">
                    <span className="reward-card__points">{reward.pointsCost} pts</span>
                    <AppButton
                      variant={reward.status === "available" ? "primary" : "secondary"}
                      disabled={reward.status !== "available"}
                      loading={redeemingId === reward.id}
                      aria-label={
                        reward.status === "available"
                          ? `Redeem for ${reward.pointsCost} pts`
                          : undefined
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
