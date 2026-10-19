import { CloudOff, Gift, Ticket } from "lucide-react";
import { Link } from "react-router-dom";

import type { RewardWithStatus } from "@sdh/contracts";

import { formatDate } from "../../lib/format";
import { EmptyState, InfoCard, LoadingState, StatusBadge } from "../ui";

export type ClaimedRewardsCardProps = {
  // Redeemed rewards, newest first.
  claimed: RewardWithStatus[];
  loading?: boolean;
  error?: string | null;
};

// Profile -> My Rewards: what the signed-in person has redeemed. Available rewards, badges and the
// leaderboard stay in Community Challenges.
export function ClaimedRewardsCard({
  claimed,
  loading = false,
  error = null,
}: ClaimedRewardsCardProps) {
  return (
    <InfoCard ariaLabel="My rewards">
      <div className="feature-card">
        <div className="feature-card-head">
          <h2 className="feature-card-title">
            <span className="inline-icon">
              <Ticket size={18} aria-hidden="true" />
              My rewards
            </span>
          </h2>
        </div>

        {loading ? (
          <LoadingState rows={1} label="Loading your rewards" />
        ) : error ? (
          <EmptyState icon={CloudOff} title="Couldn't load your rewards" description={error} />
        ) : claimed.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No claimed rewards yet"
            description="Redeem a reward in Community Challenges and it will appear here."
          />
        ) : (
          <ul className="community-list ui-stack ui-gap-2">
            {claimed.map((reward) => (
              <li key={reward.id} className="claimed-reward">
                <div className="claimed-reward-body">
                  <span className="claimed-reward-title">{reward.title}</span>
                  {reward.redeemedAt && (
                    <span className="ui-meta-row">Claimed {formatDate(reward.redeemedAt)}</span>
                  )}
                </div>
                <StatusBadge label="Claimed" variant="success" />
              </li>
            ))}
          </ul>
        )}

        <p className="ui-helper ui-flush">
          <Link to="/community/challenges">See available rewards in Challenges</Link>.
        </p>
      </div>
    </InfoCard>
  );
}
