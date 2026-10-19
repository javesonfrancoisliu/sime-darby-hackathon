import { Lock } from "lucide-react";

import type { BadgeWithEarned } from "@sdh/contracts";

import { ICON_BY_KEY } from "../../lib/icons";

export type BadgeGridProps = {
  badges: BadgeWithEarned[];
};

function hint(badge: BadgeWithEarned): string {
  if (badge.earned) return "Earned";
  return badge.kind === "points"
    ? `Reach ${badge.threshold} points`
    : `Complete ${badge.threshold} challenge${badge.threshold === 1 ? "" : "s"}`;
}

function Tiles({ badges }: BadgeGridProps) {
  return (
    <ul className="badge-grid">
      {badges.map((badge) => {
        const Icon = ICON_BY_KEY[badge.icon];
        return (
          <li key={badge.id} className={`badge-tile${badge.earned ? " badge-tile--earned" : ""}`}>
            <span className="badge-icon" aria-hidden="true">
              {badge.earned ? <Icon size={22} /> : <Lock size={18} />}
            </span>
            <span className="badge-label">{badge.title}</span>
            <span className="badge-hint">{hint(badge)}</span>
          </li>
        );
      })}
    </ul>
  );
}

// Earned and locked badges, then achievements (the badges earned by completing challenges). Locked
// tiles are dimmed with a lock icon, so state never relies on colour alone.
export function BadgeGrid({ badges }: BadgeGridProps) {
  const points = badges.filter((b) => b.kind === "points");
  const achievements = badges.filter((b) => b.kind === "challenges");
  return (
    <>
      <h3 className="impact-subhead ui-flush-top">Badges (points)</h3>
      {points.length === 0 ? (
        <p className="ui-helper">No badges yet.</p>
      ) : (
        <Tiles badges={points} />
      )}

      <h3 className="impact-subhead">Achievements (completed challenges)</h3>
      {achievements.length === 0 ? (
        <p className="ui-helper">No achievements yet.</p>
      ) : (
        <Tiles badges={achievements} />
      )}
    </>
  );
}
