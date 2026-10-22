import { Award, CheckCircle2, Star } from "lucide-react";

import { formatCount } from "../../lib/format";
import { InfoCard } from "../ui";

export type ChallengeStatsStripProps = {
  points: number;
  completed: number;
  badges: number;
};

// Compact points / completed / badges summary. Reuses the amber reward styling
// and the impact-grid layout so it matches the Home impact card.
export function ChallengeStatsStrip({ points, completed, badges }: ChallengeStatsStripProps) {
  const stats = [
    { icon: Star, value: points, label: "Points" },
    { icon: CheckCircle2, value: completed, label: "Completed" },
    { icon: Award, value: badges, label: "Badges" },
  ];

  return (
    <InfoCard className="reward-accent" ariaLabel="Your challenge progress">
      <div className="feature-card">
        <div className="feature-card-head">
          <span className="inline-icon ui-strong">Your progress</span>
        </div>
        <dl className="impact-grid">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="impact-tile">
              <span className="reward-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <dd className="reward-stat-value">{formatCount(value)}</dd>
              <dt className="impact-tile-label">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </InfoCard>
  );
}
