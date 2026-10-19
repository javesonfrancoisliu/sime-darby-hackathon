export const SORT_OPTIONS = ["nearest", "soonest", "urgent"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABEL: Record<SortOption, string> = {
  nearest: "Nearest first",
  soonest: "Soonest",
  urgent: "Most urgent",
};

export type OpportunitySortProps = {
  value: SortOption;
  onChange: (next: SortOption) => void;
};

// Compact results bar control: one themed chip per sort order.
export function OpportunitySort({ value, onChange }: OpportunitySortProps) {
  return (
    <div className="sort-control">
      <span className="sort-control-label" id="opportunity-sort-label">
        Sort
      </span>
      <div className="ui-chip-row" role="group" aria-labelledby="opportunity-sort-label">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className="ui-chip"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {SORT_LABEL[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
