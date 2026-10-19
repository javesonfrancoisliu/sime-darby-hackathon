import { Thermometer, Waves, Wind, type LucideIcon } from "lucide-react";

import type { SafetyReading } from "@sdh/contracts";
import { formatReadingValue } from "../../lib/format";
import { LEVEL_LABEL, LEVEL_VARIANT, READING_TITLE } from "../../lib/safety";
import { StatusBadge } from "../ui";

const TYPE_ICON: Record<SafetyReading["type"], LucideIcon> = {
  air: Wind,
  water: Waves,
  heat: Thermometer,
};

export type SafetyConditionCardProps = { reading: SafetyReading };

// Compact safety condition card for the Young home carousel. Shares the elderly
// visual language (leading icon, severity chip, prominent value) but smaller,
// using young design tokens and the shared StatusBadge (text + icon + colour,
// never colour alone).
export function SafetyConditionCard({ reading }: SafetyConditionCardProps) {
  const Icon = TYPE_ICON[reading.type];
  return (
    <div className="safety-condition-card">
      <div className="safety-condition-card-top">
        <span className="safety-condition-card-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
        <StatusBadge label={LEVEL_LABEL[reading.level]} variant={LEVEL_VARIANT[reading.level]} />
      </div>
      <p className="safety-condition-card-value">
        {formatReadingValue(reading.value, reading.unit)}
      </p>
      <p className="safety-condition-card-label">
        {READING_TITLE[reading.type]} · {reading.area}
      </p>
    </div>
  );
}
