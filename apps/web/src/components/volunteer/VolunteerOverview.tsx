import { ArrowRight, CheckCircle2, Clock, HandHeart, Users } from "lucide-react";

import type { ImpactSummary } from "../../types/volunteer";
import { AppLinkButton, DemoTag, InfoCard } from "../ui";

export type VolunteerOverviewProps = {
  impact: ImpactSummary;
};

function formatHours(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Compact young-role Home card: the volunteer's impact at a glance (people
 * helped, tasks completed, contribution time) plus a CTA to find opportunities.
 * Replaces the standalone My Impact panel that used to live on the Volunteer
 * page — kept small so Home does not grow.
 */
export function VolunteerOverview({ impact }: VolunteerOverviewProps) {
  const stats = [
    { icon: Users, value: impact.peopleHelped, label: "People helped" },
    { icon: CheckCircle2, value: impact.completedCount, label: "Tasks done" },
    { icon: Clock, value: formatHours(impact.totalMinutes), label: "Time given" },
  ];

  return (
    <InfoCard className="reward-accent" ariaLabel="Your volunteering impact">
      <div className="feature-card">
        <div className="feature-card-head">
          <h2 className="feature-card-title">
            <span className="inline-icon">
              <HandHeart size={18} aria-hidden="true" />
              My impact
            </span>
          </h2>
          {impact.isDemoData && <DemoTag />}
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

        <div className="feature-card-foot">
          <AppLinkButton to="/volunteer" variant="primary">
            Find ways to help
            <ArrowRight size={16} aria-hidden="true" />
          </AppLinkButton>
        </div>
      </div>
    </InfoCard>
  );
}
