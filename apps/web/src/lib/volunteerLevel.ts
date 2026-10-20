export const VOLUNTEER_LEVELS = [
  { level: 1, name: "Community Rookie", minimum: 0, icon: "sprout" },
  { level: 2, name: "Community Helper", minimum: 3, icon: "hand" },
  { level: 3, name: "Community Champion", minimum: 10, icon: "award" },
  { level: 4, name: "Community Hero", minimum: 25, icon: "trophy" },
] as const;

export function volunteerLevel(completed: number) {
  const index = completed >= 25 ? 3 : completed >= 10 ? 2 : completed >= 3 ? 1 : 0;
  return { ...VOLUNTEER_LEVELS[index], next: VOLUNTEER_LEVELS[index + 1] ?? null };
}
