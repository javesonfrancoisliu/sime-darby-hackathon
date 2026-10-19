import { ArrowRight, CloudOff, ShieldAlert } from "lucide-react";

import { useSafety } from "../../data/useSafety";
import { LEVEL_LABEL, LEVEL_VARIANT, READING_TITLE, worstReading } from "../../lib/safety";
import { AppLinkButton, EmptyState, InfoCard, LoadingState, StatusBadge } from "../ui";

// townshipName is the spoken name for assistive tech.
export type SafetyOverviewProps = { townshipName?: string };

const TYPES = ["air", "water", "heat"] as const;

// Compact safety summary for Home: the most serious air, water and heat reading, and how many
// facility reports are still open.
export function SafetyOverview({ townshipName }: SafetyOverviewProps) {
  const { data, loading, error } = useSafety();

  const rows = TYPES.flatMap((type) => {
    const worst = worstReading((data?.readings ?? []).filter((r) => r.type === type));
    return worst ? [worst] : [];
  });
  const open = (data?.facilityReports ?? []).filter((r) => r.status !== "resolved").length;

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
        ) : rows.length === 0 && open === 0 ? (
          <EmptyState
            title="No readings yet"
            description="Air, water and heat readings will show up here."
          />
        ) : (
          <>
            <ul className="ui-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rows.map((reading) => (
                <li key={`${reading.type}-${reading.area}`} className="overview-item">
                  <div className="inline-icon ui-gap-2">
                    <StatusBadge
                      label={LEVEL_LABEL[reading.level]}
                      variant={LEVEL_VARIANT[reading.level]}
                    />
                    <span className="ui-meta-row">{reading.area}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontWeight: 600 }}>
                    {READING_TITLE[reading.type]}: {reading.value} {reading.unit}
                  </p>
                </li>
              ))}
            </ul>
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
