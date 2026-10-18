import { Award, Footprints, Lock, Sparkles, Trophy, type LucideIcon } from "lucide-react";

import type { AchievementState, BadgeState } from "../../data/useGamification";

// Map the mock icon names to lucide icons (kept here so the data stays plain).
const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Footprints,
  Trophy,
  Award,
};

export type BadgeGridProps = {
  badges: BadgeState[];
  achievements: AchievementState[];
};

// Earned and locked badges + achievements. Each tile states how it is unlocked,
// and locked tiles are visibly dimmed with a lock icon (not colour alone).
export function BadgeGrid({ badges, achievements }: BadgeGridProps) {
  return (
    <>
      <h3 className="impact-subhead" style={{ marginTop: 0 }}>
        Badges (points)
      </h3>
      <ul className="badge-grid">
        {badges.map((badge) => {
          const Icon = ICONS[badge.icon] ?? Award;
          return (
            <li
              key={badge.id}
              className={`badge-tile${badge.earned ? " badge-tile--earned" : ""}`}
            >
              <span className="badge-icon" aria-hidden="true">
                {badge.earned ? <Icon size={22} /> : <Lock size={18} />}
              </span>
              <span className="badge-label">{badge.label}</span>
              <span className="badge-hint">
                {badge.earned ? "Earned" : badge.unlockHint}
              </span>
            </li>
          );
        })}
      </ul>

      <h3 className="impact-subhead">Achievements (completed challenges)</h3>
      <ul className="badge-grid">
        {achievements.map((ach) => (
          <li
            key={ach.id}
            className={`badge-tile${ach.earned ? " badge-tile--earned" : ""}`}
          >
            <span className="badge-icon" aria-hidden="true">
              {ach.earned ? <Trophy size={22} /> : <Lock size={18} />}
            </span>
            <span className="badge-label">{ach.label}</span>
            <span className="badge-hint">
              {ach.earned
                ? "Earned"
                : `Complete ${ach.completedChallengesRequired} challenge(s)`}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
