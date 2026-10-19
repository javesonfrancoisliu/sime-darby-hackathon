import {
  CalendarDays,
  HandHeart,
  LayoutGrid,
  Megaphone,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { CommunityCategory } from "../../types/community";

export type FilterValue = "all" | CommunityCategory;

type Option = { value: FilterValue; label: string; icon: LucideIcon };

const OPTIONS: Option[] = [
  { value: "all", label: "All updates", icon: LayoutGrid },
  { value: "event", label: "Events", icon: CalendarDays },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "volunteer", label: "Volunteer", icon: HandHeart },
  { value: "township", label: "Township updates", icon: Megaphone },
];

export type CategoryFilterProps = {
  value: FilterValue;
  counts: Record<FilterValue, number>;
  onChange: (value: FilterValue) => void;
};

// Quick-category row. Each chip toggles which cards are visible (stateful).
export function CategoryFilter({ value, counts, onChange }: CategoryFilterProps) {
  return (
    <div className="ui-chip-row" role="group" aria-label="Filter community updates by category">
      {OPTIONS.map(({ value: optionValue, label, icon: Icon }) => (
        <button
          key={optionValue}
          type="button"
          className="ui-chip"
          aria-pressed={value === optionValue}
          onClick={() => onChange(optionValue)}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
          <span className="ui-chip-count">{counts[optionValue]}</span>
        </button>
      ))}
    </div>
  );
}
