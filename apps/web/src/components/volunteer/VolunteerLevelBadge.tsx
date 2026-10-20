import { Award, HandHeart, Sprout, Trophy } from "lucide-react";
import { volunteerLevel } from "../../lib/volunteerLevel";

const ICONS = { sprout: Sprout, hand: HandHeart, award: Award, trophy: Trophy };

export function VolunteerLevelBadge({ completed }: { completed: number }) {
  const level = volunteerLevel(completed);
  const Icon = ICONS[level.icon];
  return (
    <span className={`volunteer-level volunteer-level--${level.level}`}>
      <Icon size={14} aria-hidden="true" />
      Lv. {level.level} {level.name}
    </span>
  );
}
