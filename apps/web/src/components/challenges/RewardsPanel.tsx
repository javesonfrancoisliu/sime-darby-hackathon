import { Gift, Lock } from "lucide-react";

import type { RewardState } from "../../data/useGamification";
import { AppButton, InfoCard, Pill, StatusBadge } from "../ui";
import { BadgeGrid } from "./BadgeGrid";
import type { AchievementState, BadgeState } from "../../data/useGamification";

export type RewardsPanelProps = {
  rewards: RewardState[];
  badges: BadgeState[];
  achievements: AchievementState[];
  onRedeem: (rewardId: string) => void;
};

// Rewards tab: simulated reward milestones (points and/or verified volunteering
// counts) plus the badges/achievements grid. No real redemption - "redeem" only
// flips a simulated state.
export function RewardsPanel({ rewards, badges, achievements, onRedeem }: RewardsPanelProps) {
  return (
    <div className="ui-stack">
      <ul className="community-list ui-stack">
        {rewards.map((reward) => (
          <InfoCard as="li" key={reward.id} ariaLabel={`Reward: ${reward.label}`}>
            <div className="feature-card">
              <div className="feature-card-head">
                <h3 className="feature-card-title">
                  <span className="inline-icon">
                    {reward.status === "locked" ? (
                      <Lock size={18} className="icon-dim" aria-hidden="true" />
                    ) : (
                      <Gift size={18} aria-hidden="true" />
                    )}
                    {reward.label}
                  </span>
                </h3>
                <Pill>{reward.pointsCost} pts</Pill>
              </div>

              <p className="feature-card-desc">{reward.description}</p>

              <div className="feature-card-foot">
                {reward.status === "redeemed" ? (
                  <StatusBadge label="Redeemed (demo)" variant="success" />
                ) : reward.status === "available" ? (
                  <AppButton variant="primary" onClick={() => onRedeem(reward.id)}>
                    Redeem (demo)
                  </AppButton>
                ) : (
                  // Short badge + separate wrapping text, so the long requirement
                  // never overflows the non-wrapping StatusBadge at 360px.
                  <div className="reward-lock">
                    <StatusBadge label="Locked" variant="info" icon={Lock} />
                    <span className="reward-lock-hint">{reward.unlockHint}</span>
                  </div>
                )}
              </div>
            </div>
          </InfoCard>
        ))}
      </ul>

      <InfoCard ariaLabel="Badges and achievements">
        <BadgeGrid badges={badges} achievements={achievements} />
      </InfoCard>
    </div>
  );
}
