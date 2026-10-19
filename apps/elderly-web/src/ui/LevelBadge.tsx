import { levelByNumber, VOLUNTEER_LEVELS, type VolunteerLevelNumber } from "./volunteerLevels";

interface LevelBadgeProps {
  level: VolunteerLevelNumber;
  /** Compact pill shows just "Lv. N"; full also shows the level name. */
  variant?: "compact" | "full";
}

/**
 * A small coloured pill showing a volunteer's community level, e.g.
 * "Lv. 2 · Community Helper". Replaces the old verified shield beside a
 * volunteer's name. Colour is reinforced by the text label, never colour alone
 * (apple-design clear-status).
 */
export function LevelBadge({ level, variant = "compact" }: LevelBadgeProps) {
  const lvl = levelByNumber(level);
  const Icon = lvl.icon;
  return (
    <span
      className={`level-badge level-badge--${variant}`}
      style={{ ["--level-color" as string]: lvl.color }}
      title={`Level ${lvl.level} — ${lvl.name}`}
    >
      <span className="level-badge__icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2.2} />
      </span>
      <span className="level-badge__text">
        Lv. {lvl.level}
        {variant === "full" ? ` · ${lvl.name}` : ""}
      </span>
    </span>
  );
}

/**
 * The "Recommended volunteer levels" legend: one row per level with its icon,
 * name and task range (matches the reference). Shown on a matched request's
 * detail page so residents understand the volunteer's level badge.
 */
export function LevelLegend() {
  return (
    <div className="level-legend">
      <h2 className="level-legend__title">Volunteer levels</h2>
      <ul className="level-legend__list">
        {VOLUNTEER_LEVELS.map((lvl) => {
          const Icon = lvl.icon;
          return (
            <li key={lvl.level} className="level-legend__row">
              <span
                className="level-legend__icon"
                style={{ ["--level-color" as string]: lvl.color }}
                aria-hidden="true"
              >
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <div className="level-legend__text">
                <p className="level-legend__name">
                  Level {lvl.level} — {lvl.name}
                </p>
                <p className="level-legend__range">{lvl.range}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
