import { CloudOff, Droplets, ShieldAlert, Thermometer, Wind, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import type { FacilityStatus, SafetyReading } from "@sdh/contracts";

import {
  AppButton,
  EmptyState,
  InfoCard,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "../../components/ui";
import { useSafety } from "../../data/useSafety";
import { formatDateTime } from "../../lib/format";
import { FACILITY_STATUS, LEVEL_LABEL, LEVEL_VARIANT, READING_TITLE } from "../../lib/safety";

type StatusFilter = "all" | FacilityStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reported", label: FACILITY_STATUS.reported.label },
  { value: "in_progress", label: FACILITY_STATUS.in_progress.label },
  { value: "resolved", label: FACILITY_STATUS.resolved.label },
];

const READING_ICON = { air: Wind, water: Droplets, heat: Thermometer } as const;

function detail(reading: SafetyReading): string | null {
  switch (reading.type) {
    case "water":
      return `${reading.waterBody === "river" ? "River" : "Lake"}, normal up to ${reading.normalMax} ${reading.unit}`;
    case "heat":
      return `Feels like ${reading.feelsLike}°C, humidity ${reading.humidity}%`;
    case "air":
      return null;
  }
}

function ReadingCard({ reading }: { reading: SafetyReading }) {
  const Icon = READING_ICON[reading.type];
  const title = reading.type === "water" ? reading.name : reading.area;
  const extra = detail(reading);
  return (
    <InfoCard as="li" ariaLabel={`${READING_TITLE[reading.type]}: ${title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">
            <span className="inline-icon">
              <Icon size={18} className="icon-dim" aria-hidden="true" />
              {title}
            </span>
          </h3>
          <StatusBadge label={LEVEL_LABEL[reading.level]} variant={LEVEL_VARIANT[reading.level]} />
        </div>
        <p className="reward-stat-value ui-flush">
          {reading.value} {reading.unit}
        </p>
        {reading.type === "water" && <span className="ui-meta-row">{reading.area}</span>}
        {extra && <span className="ui-meta-row">{extra}</span>}
        <p className="feature-card-desc">{reading.advice}</p>
        <span className="ui-meta-row">Measured {formatDateTime(reading.measuredAt)}</span>
      </div>
    </InfoCard>
  );
}

// Read-only safety page: the latest air, water and heat readings and the facility reports.
export function SafetyPage() {
  const { data, loading, error, reload } = useSafety();
  const [status, setStatus] = useState<StatusFilter>("all");

  const readings = useMemo(
    () => ({
      air: (data?.readings ?? []).filter((r) => r.type === "air"),
      water: (data?.readings ?? []).filter((r) => r.type === "water"),
      heat: (data?.readings ?? []).filter((r) => r.type === "heat"),
    }),
    [data],
  );
  const reports = useMemo(
    () =>
      (data?.facilityReports ?? [])
        .filter((r) => status === "all" || r.status === status)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [data, status],
  );

  return (
    <>
      <PageHeader
        title="Health & Safety"
        subtitle="Local hazard conditions and facility reports for your township."
      />

      {loading ? (
        <LoadingState rows={3} label="Loading safety information" />
      ) : error ? (
        <InfoCard>
          <EmptyState
            icon={CloudOff}
            title="Couldn't load safety information"
            description={error}
            action={
              <AppButton variant="secondary" onClick={() => void reload()}>
                Try again
              </AppButton>
            }
          />
        </InfoCard>
      ) : (
        <>
          {(["air", "water", "heat"] as const).map((type) => (
            <section key={type} className="ui-section" aria-labelledby={`${type}-heading`}>
              <h2 className="ui-section-title" id={`${type}-heading`}>
                {READING_TITLE[type]}
              </h2>
              {readings[type].length === 0 ? (
                <InfoCard>
                  <EmptyState
                    icon={ShieldAlert}
                    title="No readings yet"
                    description="The latest readings will show up here."
                  />
                </InfoCard>
              ) : (
                <ul className="ui-grid community-list">
                  {readings[type].map((reading) => (
                    <ReadingCard
                      key={`${reading.type}-${reading.area}-${reading.type === "water" ? reading.name : ""}`}
                      reading={reading}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="ui-section" aria-labelledby="facility-heading">
            <h2 className="ui-section-title" id="facility-heading">
              Facility reports
            </h2>
            <div
              className="ui-chip-row"
              role="group"
              aria-label="Filter facility reports by status"
            >
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className="ui-chip"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {reports.length === 0 ? (
              <InfoCard>
                <EmptyState
                  icon={Wrench}
                  title={status === "all" ? "No facility reports" : "No reports with this status"}
                  description={
                    status === "all"
                      ? "Reports about local facilities will show up here."
                      : "Try a different status."
                  }
                />
              </InfoCard>
            ) : (
              <ul className="ui-grid community-list" style={{ marginTop: "var(--space-4)" }}>
                {reports.map((report) => {
                  const state = FACILITY_STATUS[report.status];
                  return (
                    <InfoCard
                      as="li"
                      key={report.id}
                      ariaLabel={`Facility report: ${report.title}`}
                    >
                      <div className="feature-card">
                        <div className="feature-card-head">
                          <h3 className="feature-card-title">{report.title}</h3>
                          <StatusBadge label={state.label} variant={state.variant} />
                        </div>
                        <span className="ui-meta-row">
                          {report.area} · {report.category}
                        </span>
                        {report.description && (
                          <p className="feature-card-desc">{report.description}</p>
                        )}
                        <span className="ui-meta-row">
                          Reported {formatDateTime(report.reportedAt)} · Updated{" "}
                          {formatDateTime(report.updatedAt)}
                        </span>
                      </div>
                    </InfoCard>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
