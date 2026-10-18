export type SortOption = "nearest" | "soonest" | "urgent";

export const SORT_LABEL: Record<SortOption, string> = {
  nearest: "Nearest first",
  soonest: "Soonest",
  urgent: "Most urgent",
};

export type OpportunitySortProps = {
  value: SortOption;
  onChange: (next: SortOption) => void;
};

// Compact results bar control: a single Sort dropdown.
export function OpportunitySort({ value, onChange }: OpportunitySortProps) {
  return (
    <div className="sort-control">
      <label className="ui-visually-hidden" htmlFor="opportunity-sort">
        Sort opportunities
      </label>
      <span className="sort-control-label" aria-hidden="true">
        Sort
      </span>
      <select
        id="opportunity-sort"
        className="ui-input sort-select"
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
      >
        {(Object.keys(SORT_LABEL) as SortOption[]).map((option) => (
          <option key={option} value={option}>
            {SORT_LABEL[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
