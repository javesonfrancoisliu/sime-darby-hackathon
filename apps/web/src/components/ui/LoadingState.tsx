export type LoadingStateProps = {
  // Number of skeleton cards to show.
  rows?: number;
  label?: string;
};

// Skeleton placeholder that mirrors the card grid so layout does not jump.
export function LoadingState({ rows = 3, label = "Loading" }: LoadingStateProps) {
  return (
    <div className="ui-grid" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ui-skeleton" style={{ height: 168 }} />
      ))}
      <span className="ui-visually-hidden">{label}…</span>
    </div>
  );
}
