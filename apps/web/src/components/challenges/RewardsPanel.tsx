import { CloudOff, Gift, Lock } from "lucide-react";

import type { BadgeWithEarned, RewardWithStatus } from "@sdh/contracts";

import { formatDate } from "../../lib/format";
import { ICON_BY_KEY } from "../../lib/icons";
import { AppButton, EmptyState, InfoCard, LoadingState, Pill, StatusBadge } from "../ui";
import { BadgeGrid } from "./BadgeGrid";

export type RewardsPanelProps = {
  rewards: RewardWithStatus[];
  badges: BadgeWithEarned[];
  loading: boolean;
  error: string | null;
  // Spendable points, to say how many a locked reward still needs.
  points: number;
  // The id of the reward being redeemed.
  redeemingId: string | null;
  onRedeem: (reward: RewardWithStatus) => void;
};

function lockHint(reward: RewardWithStatus, points: number): string {
  const needs: string[] = [];
  if (points < reward.pointsCost) needs.push(`${reward.pointsCost - points} more points`);
  if (reward.minVolunteerTasks) {
    needs.push(`${reward.minVolunteerTasks} completed volunteering tasks`);
  }
  return needs.length > 0 ? `Needs ${needs.join(" and ")}` : "Not available yet";
}

// Rewards tab: rewards with their status for this person, then the badges grid. Redeeming spends points.
export function RewardsPanel({
  rewards,
  badges,
  loading,
  error,
  points,
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
                <div className="feature-card">
                  <div className="feature-card-head">
                    <h3 className="feature-card-title">
                      <span className="inline-icon">
                        {reward.status === "locked" ? (
                          <Lock size={18} className="icon-dim" aria-hidden="true" />
                        ) : (
                          <Icon size={18} aria-hidden="true" />
                        )}
                        {reward.title}
                      </span>
                    </h3>
                    <Pill>{reward.pointsCost} pts</Pill>
                  </div>

                  {reward.partner && <span className="ui-meta-row">From {reward.partner}</span>}
                  <p className="feature-card-desc">{reward.description}</p>

                  <div className="feature-card-foot">
                    {reward.status === "redeemed" ? (
                      <StatusBadge
                        label={
                          reward.redeemedAt
                            ? `Redeemed ${formatDate(reward.redeemedAt)}`
                            : "Redeemed"
                        }
                        variant="success"
                      />
                    ) : reward.status === "available" ? (
                      <AppButton
                        variant="primary"
                        loading={redeemingId === reward.id}
                        onClick={() => onRedeem(reward)}
                      >
                        Redeem for {reward.pointsCost} pts
                      </AppButton>
                    ) : (
                      // Short badge + separate wrapping text, so the requirement never overflows.
                      <div className="reward-lock">
                        <StatusBadge label="Locked" variant="info" icon={Lock} />
                        <span className="reward-lock-hint">{lockHint(reward, points)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </InfoCard>
            );
          })}
        </ul>
      )}

      <InfoCard ariaLabel="Badges and achievements">
        {badges.length === 0 && !loading ? (
          <p className="ui-helper ui-flush">No badges yet.</p>
        ) : (
          <BadgeGrid badges={badges} />
        )}
      </InfoCard>
    </div>
  );
}
