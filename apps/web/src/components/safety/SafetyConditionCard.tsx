import { Thermometer, Waves, Wind, type LucideIcon } from "lucide-react";

import type { SafetyReading } from "@sdh/contracts";
import { formatReadingValue, formatWhen } from "../../lib/format";
import { LEVEL_LABEL, LEVEL_SEVERITY_STEP, READING_TITLE } from "../../lib/safety";

const TYPE_ICON: Record<SafetyReading["type"], LucideIcon> = {
  air: Wind,
  water: Waves,
  heat: Thermometer,
};

export type SafetyConditionCardProps = { reading: SafetyReading };

// Safety condition card for the Young home carousel. Reuses the elderly home's
// condition-card design exactly (leading icon chip, severity chip, big value +
// unit, label/location), driven by the shared --sev-* severity ramp via the
// data-severity attribute. Styling is ported into the young app.css under the
// same class names; the elderly app is untouched.
export function SafetyConditionCard({ reading }: SafetyConditionCardProps) {
  const Icon = TYPE_ICON[reading.type];
  const severity = LEVEL_SEVERITY_STEP[reading.level];
  const [value, unit] = splitValueUnit(formatReadingValue(reading.value, reading.unit));

  return (
    <div className="apple-condition-card apple-condition-card--sev" data-severity={severity}>
      <div className="apple-condition-card__top">
        <span className="apple-condition-card__icon" aria-hidden="true">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <span className="safety-chip apple-condition-card__chip">{LEVEL_LABEL[reading.level]}</span>
      </div>
      <div className="apple-condition-card__main">
        <span className="apple-condition-card__value">{value}</span>
        {unit && <span className="apple-condition-card__unit">{unit}</span>}
      </div>
      <span className="apple-condition-card__label">{READING_TITLE[reading.type]}</span>
      <span className="apple-condition-card__location">{reading.area}</span>
      <span className="apple-condition-card__location">
        Updated {formatWhen(reading.measuredAt)}
      </span>
    </div>
  );
}

// "62 AQI" -> ["62", "AQI"]; "34°C" -> ["34°C", ""] so the temperature stays whole.
function splitValueUnit(formatted: string): [string, string] {
  const spaced = formatted.split(" ");
  return spaced.length === 2 ? [spaced[0]!, spaced[1]!] : [formatted, ""];
}
