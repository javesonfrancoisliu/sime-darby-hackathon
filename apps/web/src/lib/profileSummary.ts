import type { ProfilePrefs } from "../types/profile";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// One line for the My details row: what the person has set up for volunteering.
export function preferencesSummary(prefs: ProfilePrefs): string {
  const parts = [
    prefs.skills.length > 0 && count(prefs.skills.length, "skill", "skills"),
    prefs.interests.length > 0 && count(prefs.interests.length, "interest", "interests"),
    prefs.languages.length > 0 && count(prefs.languages.length, "language", "languages"),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Set your volunteering preferences";
}
