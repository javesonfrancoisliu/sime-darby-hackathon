export type ProgressBarProps = {
  /** Current value. */
  value: number;
  /** Target value (max). */
  max: number;
  /** Accessible label describing what is progressing. */
  label: string;
  /** Show a "value / max" caption above the bar. */
  caption?: string;
};

/**
 * Accessible progress indicator. Reusable across features (challenges, future
 * goals). Styled with design tokens; the fill uses the amber reward accent.
 */
export function ProgressBar({ value, max, label, caption }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));
  return (
    <div className="ui-progress">
      {caption && <div className="ui-progress-caption">{caption}</div>}
      <div
        className="ui-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className="ui-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
