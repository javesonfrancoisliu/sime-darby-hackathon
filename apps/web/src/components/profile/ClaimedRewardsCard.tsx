import { Gift, Ticket } from "lucide-react";
import { Link } from "react-router-dom";

import type { ClaimedReward } from "../../data/useGamification";
import { formatDate } from "../../lib/format";
import { DemoTag, EmptyState, InfoCard, StatusBadge } from "../ui";

export type ClaimedRewardsCardProps = {
  claimed: ClaimedReward[];
};

/**
 * Profile → My Rewards: the user's claimed (redeemed) rewards, reusing the
 * gamification redemption state. Available rewards / badges / leaderboard stay in
 * Community Challenges — this only shows what was claimed. All fictional / demo.
 */
export function ClaimedRewardsCard({ claimed }: ClaimedRewardsCardProps) {
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
          <DemoTag />
        </div>

        {claimed.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No claimed rewards yet"
            description="Redeem a reward in Community Challenges and it will appear here."
          />
        ) : (
          <ul className="community-list ui-stack" style={{ gap: "var(--space-2)" }}>
            {claimed.map((reward) => (
              <li key={reward.id} className="claimed-reward">
                <div className="claimed-reward-body">
                  <span className="claimed-reward-title">{reward.label}</span>
                  <span className="ui-meta-row">
                    {reward.redeemedAt
                      ? `Claimed ${formatDate(reward.redeemedAt)}`
                      : "Claimed (demo)"}
                  </span>
                </div>
                <StatusBadge label="Claimed" variant="success" />
              </li>
            ))}
          </ul>
        )}

        <p className="ui-helper" style={{ margin: 0 }}>
          Fictional demo rewards — no real voucher, code or payment is issued.{" "}
          <Link to="/community/challenges">See available rewards in Challenges</Link>.
        </p>
      </div>
    </InfoCard>
  );
}
