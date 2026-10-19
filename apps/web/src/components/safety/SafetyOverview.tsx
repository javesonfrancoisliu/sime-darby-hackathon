import { AlertTriangle, CloudOff, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import type { SafetyReading } from "@sdh/contracts";
import { useSafety } from "../../data/useSafety";
import { LEVEL_LABEL, LEVEL_SEVERITY_STEP, READING_TITLE, worstReading } from "../../lib/safety";
import { Carousel, EmptyState, InfoCard, LoadingState } from "../ui";
import { SafetyConditionCard } from "./SafetyConditionCard";

// townshipName is the spoken name for assistive tech, and the location subtitle.
export type SafetyOverviewProps = { townshipName?: string };

const TYPES = ["air", "water", "heat"] as const;

// Readings at severity 4+ (alert/danger) warrant a persistent line, visible
// without swiping.
const SERIOUS_STEP = 4;

// Safety summary for Home, using the same "Township Live Conditions" design as
// the elderly home: a section header with an "All hazards" link and a manual
// swipe carousel of themed, severity-coloured condition cards (worst first).
export function SafetyOverview({ townshipName }: SafetyOverviewProps) {
  const { data, loading, error } = useSafety();

  const readings: SafetyReading[] = TYPES.flatMap((type) => {
    const worst = worstReading((data?.readings ?? []).filter((r) => r.type === type));
    return worst ? [worst] : [];
  }).sort((a, b) => LEVEL_SEVERITY_STEP[b.level] - LEVEL_SEVERITY_STEP[a.level]);

  const open = (data?.facilityReports ?? []).filter((r) => r.status !== "resolved").length;
  // The most serious reading (now first). A compact warning line surfaces it so a
  // critical alert is never hidden behind a swipe.
  const worst = readings[0];
  const alert = worst && LEVEL_SEVERITY_STEP[worst.level] >= SERIOUS_STEP ? worst : undefined;

  return (
    <InfoCard ariaLabel={`Safety summary${townshipName ? ` for ${townshipName}` : ""}`}>
      <div className="app-home__section-header">
        <div>
          <h2 className="app-home__section-title">Township Live Conditions</h2>
          <p className="app-home__section-subtitle">
            <MapPin className="icon-inline" size={12} strokeWidth={2} aria-hidden="true" />
            {townshipName ?? "Elmina"}
          </p>
        </div>
        <Link to="/safety" className="app-home__see-all">
          All hazards
        </Link>
      </div>

      {loading ? (
        <LoadingState rows={2} label="Loading safety readings" />
      ) : error ? (
        <EmptyState icon={CloudOff} title="Couldn't load safety readings" description={error} />
      ) : readings.length === 0 && open === 0 ? (
        <EmptyState
          title="No readings yet"
          description="Air, water and heat readings will show up here."
        />
      ) : (
        <>
          {alert && (
            <p className="safety-alert-line" role="status">
              <AlertTriangle size={16} aria-hidden="true" />
              {LEVEL_LABEL[alert.level]}: {READING_TITLE[alert.type]} in {alert.area}
            </p>
          )}
          {readings.length > 0 && (
            <Carousel
              ariaLabel="Township live conditions"
              slides={readings.map((reading) => (
                <SafetyConditionCard key={`${reading.type}-${reading.area}`} reading={reading} />
              ))}
            />
          )}
          <p className="ui-meta-row ui-flush">
            {open === 0
              ? "No open facility reports."
              : `${open} open facility report${open === 1 ? "" : "s"}.`}
          </p>
        </>
      )}
    </InfoCard>
  );
}
