import type { ComponentType } from "react";
import { IconSprout, IconHeartHandshake, IconAward, IconTrophy, type IconProps } from "./Icons";

export type VolunteerLevelNumber = 1 | 2 | 3 | 4;

export interface VolunteerLevel {
  level: VolunteerLevelNumber;
  /** Short name, e.g. "Community Rookie". */
  name: string;
  /** Inclusive lower bound of completed volunteer tasks. */
  minTasks: number;
  /** Inclusive upper bound, or null for the open-ended top level. */
  maxTasks: number | null;
  /** Human-readable task range, e.g. "0–2 completed volunteer tasks". */
  range: string;
  icon: ComponentType<IconProps>;
  /** Accent colour for the badge/icon (matches the attachment). */
  color: string;
}

// The four community volunteer levels (matches the "Recommended volunteer
// levels" reference). Levels are earned by completed volunteer tasks.
export const VOLUNTEER_LEVELS: VolunteerLevel[] = [
  {
    level: 1,
    name: "Community Rookie",
    minTasks: 0,
    maxTasks: 2,
    range: "0–2 completed volunteer tasks",
    icon: IconSprout,
    color: "#16A34A",
  },
  {
    level: 2,
    name: "Community Helper",
    minTasks: 3,
    maxTasks: 9,
    range: "3–9 completed volunteer tasks",
    icon: IconHeartHandshake,
    color: "#2563EB",
  },
  {
    level: 3,
    name: "Community Champion",
    minTasks: 10,
    maxTasks: 24,
    range: "10–24 completed volunteer tasks",
    icon: IconAward,
    color: "#EA580C",
  },
  {
    level: 4,
    name: "Community Hero",
    minTasks: 25,
    maxTasks: null,
    range: "25+ completed volunteer tasks",
    icon: IconTrophy,
    color: "#7C3AED",
  },
];

/** Resolve the level for a given completed-task count. */
export function levelForTasks(tasks: number): VolunteerLevel {
  // Walk from the top so 25+ wins; fall back to level 1.
  for (let i = VOLUNTEER_LEVELS.length - 1; i >= 0; i -= 1) {
    const lvl = VOLUNTEER_LEVELS[i]!;
    if (tasks >= lvl.minTasks) return lvl;
  }
  return VOLUNTEER_LEVELS[0]!;
}

/** Look up a level by its number. */
export function levelByNumber(n: VolunteerLevelNumber): VolunteerLevel {
  return VOLUNTEER_LEVELS.find((l) => l.level === n) ?? VOLUNTEER_LEVELS[0]!;
}
