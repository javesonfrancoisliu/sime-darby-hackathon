export const SORT_OPTIONS = ["best_match", "nearest", "soonest", "urgent"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABEL: Record<SortOption, string> = {
  best_match: "Best Match",
  nearest: "Nearest First",
  soonest: "Date (Soonest)",
  urgent: "Most Urgent",
};

export type OpportunitySortProps = {
  value: SortOption;
  onChange: (next: SortOption) => void;
};

export function OpportunitySort({ value, onChange }: OpportunitySortProps) {
  return (
    <div className="sort-control">
      <label className="sort-control-label" htmlFor="opportunity-sort">
        Sort by
      </label>
      <select
        id="opportunity-sort"
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABEL[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
