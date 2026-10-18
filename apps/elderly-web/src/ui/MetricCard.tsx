import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
}

/**
 * Health-metric card using standardized monochrome line icon.
 * (heart rate, steps, sleep, blood pressure).
 */
export function MetricCard({ label, value, unit, icon }: MetricCardProps) {
  return (
    <div className="app-metric-card">
      <div className="app-metric-card__icon-row">
        {icon && (
          <span className="app-metric-card__icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="app-metric-card__value">
        {value}
        {unit && <span className="app-metric-card__unit">{unit}</span>}
      </div>
      <div className="app-metric-card__label">{label}</div>
    </div>
  );
}
