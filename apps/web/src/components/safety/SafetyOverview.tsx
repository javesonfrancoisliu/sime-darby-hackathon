import { AlertTriangle, ArrowRight, CloudOff, ShieldAlert } from "lucide-react";

import type { SafetyReading } from "@sdh/contracts";
import { useSafety } from "../../data/useSafety";
import { LEVEL_LABEL, LEVEL_VARIANT, READING_TITLE, worstReading } from "../../lib/safety";
import type { BadgeVariant } from "../../lib/status";
import { AppLinkButton, Carousel, EmptyState, InfoCard, LoadingState } from "../ui";
import { SafetyConditionCard } from "./SafetyConditionCard";

// townshipName is the spoken name for assistive tech.
export type SafetyOverviewProps = { townshipName?: string };

const TYPES = ["air", "water", "heat"] as const;

// Worst-first ordering: danger > warning > info > success.
const VARIANT_RANK: Record<BadgeVariant, number> = { danger: 0, warning: 1, info: 2, success: 3 };
// Variants that warrant a persistent warning line (visible without swiping).
const SERIOUS = new Set<BadgeVariant>(["danger", "warning"]);

// Compact safety summary for Home: a manual swipe carousel of the most serious air,
// water and heat readings (worst first), plus how many facility reports are still open.
export function SafetyOverview({ townshipName }: SafetyOverviewProps) {
  const { data, loading, error } = useSafety();

  const readings: SafetyReading[] = TYPES.flatMap((type) => {
    const worst = worstReading((data?.readings ?? []).filter((r) => r.type === type));
    return worst ? [worst] : [];
  }).sort((a, b) => VARIANT_RANK[LEVEL_VARIANT[a.level]] - VARIANT_RANK[LEVEL_VARIANT[b.level]]);

  const open = (data?.facilityReports ?? []).filter((r) => r.status !== "resolved").length;
  // The most serious reading (now first). A compact warning line surfaces it so a
  // critical alert is never hidden behind a swipe.
  const worst = readings[0];
  const alert = worst && SERIOUS.has(LEVEL_VARIANT[worst.level]) ? worst : undefined;

  return (
    <InfoCard ariaLabel={`Safety summary${townshipName ? ` for ${townshipName}` : ""}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h2 className="feature-card-title">
            <span className="inline-icon">
              <ShieldAlert size={18} aria-hidden="true" />
              Health & Safety
            </span>
          </h2>
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
                ariaLabel="Township safety conditions"
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

        <div className="feature-card-foot">
          <AppLinkButton to="/safety" variant="secondary">
            View safety details
            <ArrowRight size={16} aria-hidden="true" />
          </AppLinkButton>
        </div>
      </div>
    </InfoCard>
  );
}
