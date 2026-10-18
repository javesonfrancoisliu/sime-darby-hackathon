import { Award, CheckCircle2, Star } from "lucide-react";

import type { GamificationSummary } from "../../types/gamification";
import { DemoTag, InfoCard } from "../ui";

export type ChallengeStatsStripProps = {
  summary: GamificationSummary;
};

// Compact points / completed / badges summary. Reuses the amber reward styling
// and the impact-grid layout so it matches the Home impact card.
export function ChallengeStatsStrip({ summary }: ChallengeStatsStripProps) {
  const stats = [
    { icon: Star, value: summary.totalPoints, label: "Points" },
    { icon: CheckCircle2, value: summary.completedChallenges, label: "Completed" },
    { icon: Award, value: summary.earnedBadgeIds.length, label: "Badges" },
  ];

  return (
    <InfoCard className="reward-accent" ariaLabel="Your challenge progress">
      <div className="feature-card">
        <div className="feature-card-head">
          <span className="inline-icon" style={{ fontWeight: 700 }}>
            Your progress
          </span>
          <DemoTag />
        </div>
        <dl className="impact-grid">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="impact-tile">
              <span className="reward-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <dd className="reward-stat-value">{value}</dd>
              <dt className="impact-tile-label">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </InfoCard>
  );
}
