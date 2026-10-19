import {
  AlertTriangle,
  CloudOff,
  Info,
  MapPin,
  Thermometer,
  Waves,
  Wind,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import type { FacilityStatus } from "@sdh/contracts";

import {
  AppButton,
  Drawer,
  EmptyState,
  InfoCard,
  LoadingState,
  PageHeader,
  TabPanel,
  Tabs,
} from "../../components/ui";
import { useSafety } from "../../data/useSafety";
import { formatTemperature, formatWhen, withUnit } from "../../lib/format";
import {
  AIR_LEVEL,
  FACILITY_TONE,
  HAZE_API_SCALE_MAX,
  HEAT_LEVEL,
  WATER_STATUS,
  waterBarLevel,
} from "../../lib/safety";

type SafetyTab = "air" | "water" | "heat" | "facilities";

const SAFETY_TABS: { id: SafetyTab; label: string }[] = [
  { id: "air", label: "Air" },
  { id: "water", label: "Water" },
  { id: "heat", label: "Heat" },
  { id: "facilities", label: "Facilities" },
];

const SECTION_TITLE: Record<SafetyTab, string> = {
  air: "Air Quality & Haze API",
  water: "River & Lake Water Levels",
  heat: "Temperature Alerts",
  facilities: "Facility Reports (Reported · In Progress · Fixed)",
};

const SECTION_ICON: Record<SafetyTab, ReactNode> = {
  air: <Wind size={22} strokeWidth={1.8} aria-hidden="true" />,
  water: <Waves size={22} strokeWidth={1.8} aria-hidden="true" />,
  heat: <Thermometer size={22} strokeWidth={1.8} aria-hidden="true" />,
  facilities: <Wrench size={22} strokeWidth={1.8} aria-hidden="true" />,
};

type StatusFilter = "all" | FacilityStatus;
const FACILITY_STATUSES: FacilityStatus[] = ["reported", "in_progress", "resolved"];
const FILTER_STATUSES: StatusFilter[] = ["all", ...FACILITY_STATUSES];

// Section heading with an outline icon. The id is what the section's
// aria-labelledby points to.
function SectionHeading({ id, icon, title }: { id: string; icon: ReactNode; title: string }) {
  return (
    <div className="safety-section__heading">
      <span className="safety-section__heading-icon" aria-hidden="true">
        {icon}
      </span>
      <h2 id={id} className="safety-section__heading-text">
        {title}
      </h2>
    </div>
  );
}

// Read-only safety page. Air, water, heat and facility reports live in tabs
// (like the elderly safety page) so residents switch between them instead of
// scrolling one long page. Each tab mirrors the elderly per-tab layout.
export function SafetyPage() {
  const { data, loading, error, reload } = useSafety();
  const [tab, setTab] = useState<SafetyTab>("air");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [openFacility, setOpenFacility] = useState<string | null>(null);

  const readings = useMemo(
    () => ({
      air: (data?.readings ?? []).filter((r) => r.type === "air"),
      water: (data?.readings ?? []).filter((r) => r.type === "water"),
      heat: (data?.readings ?? []).filter((r) => r.type === "heat"),
    }),
    [data],
  );
  const facilityReports = useMemo(
    () =>
      (data?.facilityReports ?? [])
        .slice()
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [data],
  );
  const filteredFacilities = useMemo(
    () => (status === "all" ? facilityReports : facilityReports.filter((r) => r.status === status)),
    [facilityReports, status],
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
          <Tabs
            idBase="safety"
            label="Safety sections"
            tabs={SAFETY_TABS}
            value={tab}
            onChange={setTab}
          />

          {tab === "air" && (
            <TabPanel idBase="safety" id="air">
              <section className="ui-section" aria-labelledby="air-heading">
                <SectionHeading
                  id="air-heading"
                  icon={SECTION_ICON.air}
                  title={SECTION_TITLE.air}
                />
                {readings.air.length === 0 ? (
                  <p className="ui-page-subtitle">No air quality readings have been posted yet.</p>
                ) : (
                  <div className="ui-stack" role="list">
                    {readings.air.map((r) => {
                      const s = AIR_LEVEL[r.level];
                      const pct = Math.min((r.value / HAZE_API_SCALE_MAX) * 100, 100);
                      return (
                        <div
                          key={r.area}
                          className="safety-card"
                          role="listitem"
                          aria-label={`Air quality: ${r.area}`}
                        >
                          <div className="safety-card__row">
                            <div>
                              <p className="safety-card__location">{r.area}</p>
                              <p className="safety-card__meta">
                                Updated: {formatWhen(r.measuredAt)}
                              </p>
                            </div>
                            <div className={`safety-card__badge tone-${s.tone}`}>
                              <span className="safety-card__badge-value">{r.value}</span>
                              <span className="safety-card__badge-label">API · {s.label}</span>
                            </div>
                          </div>
                          <div
                            className="safety-bar"
                            aria-label={`API level ${r.value} out of ${HAZE_API_SCALE_MAX}`}
                          >
                            <div
                              className={`safety-bar__fill safety-bar__fill--tone tone-${s.tone}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="safety-card__tip">
                            <Info
                              className="icon-inline-low"
                              size={14}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            {r.advice}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </TabPanel>
          )}

          {tab === "water" && (
            <TabPanel idBase="safety" id="water">
              <section className="ui-section" aria-labelledby="water-heading">
                <SectionHeading
                  id="water-heading"
                  icon={SECTION_ICON.water}
                  title={SECTION_TITLE.water}
                />
                {readings.water.length === 0 ? (
                  <p className="ui-page-subtitle">No water level readings have been posted yet.</p>
                ) : (
                  <div className="ui-stack" role="list">
                    {readings.water.map((r) => {
                      const s = WATER_STATUS[r.level];
                      const pct = Math.min((r.value / r.normalMax) * 100, 100);
                      return (
                        <div
                          key={`${r.name}-${r.area}`}
                          className="safety-card"
                          role="listitem"
                          aria-label={`Water levels: ${r.name}`}
                        >
                          <div className="safety-card__row">
                            <div>
                              <p className="safety-card__location">{r.name}</p>
                              <p className="safety-card__meta">
                                {r.waterBody === "river" ? "River gauge" : "Lake"} ·{" "}
                                {withUnit(r.value, r.unit)} / {withUnit(r.normalMax, r.unit)} normal
                                max · {formatWhen(r.measuredAt)}
                              </p>
                            </div>
                            <span className={`safety-chip-tone tone-${s.tone}`}>{s.label}</span>
                          </div>
                          <div
                            className="safety-bar"
                            aria-label={`Water level ${withUnit(r.value, r.unit)} of ${withUnit(
                              r.normalMax,
                              r.unit,
                            )}`}
                          >
                            <div
                              className={`safety-bar__fill safety-bar__fill--${waterBarLevel(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </TabPanel>
          )}

          {tab === "heat" && (
            <TabPanel idBase="safety" id="heat">
              <section className="ui-section" aria-labelledby="heat-heading">
                <SectionHeading
                  id="heat-heading"
                  icon={SECTION_ICON.heat}
                  title={SECTION_TITLE.heat}
                />
                {readings.heat.length === 0 ? (
                  <p className="ui-page-subtitle">No temperature readings have been posted yet.</p>
                ) : (
                  <div className="ui-stack" role="list">
                    {readings.heat.map((t) => {
                      const s = HEAT_LEVEL[t.level];
                      return (
                        <div
                          key={t.area}
                          className={`safety-card safety-card--temperature${
                            t.level === "normal" ? "" : " safety-card--alert"
                          }`}
                          role="listitem"
                          aria-label={`Heat: ${t.area}`}
                        >
                          <div className="safety-temp__main">
                            <div className="safety-temp__reading">
                              <span className="safety-temp__value">
                                {formatTemperature(t.value, t.unit)}
                              </span>
                              <span className={`safety-chip-tone tone-${s.tone}`}>{s.label}</span>
                            </div>
                            <p className="safety-card__meta">
                              <MapPin
                                className="icon-inline"
                                size={12}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              {t.area} · {formatWhen(t.measuredAt)}
                            </p>
                          </div>
                          <div className="safety-temp__stats">
                            <div className="safety-temp__stat">
                              <span className="safety-temp__stat-label">Feels like</span>
                              <span className="safety-temp__stat-value">
                                {formatTemperature(t.feelsLike, t.unit)}
                              </span>
                            </div>
                            <div className="safety-temp__stat">
                              <span className="safety-temp__stat-label">Humidity</span>
                              <span className="safety-temp__stat-value">{t.humidity}%</span>
                            </div>
                          </div>
                          <div className="safety-advisory">
                            <AlertTriangle
                              className="icon-inline-low"
                              size={16}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            {t.advice}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </TabPanel>
          )}

          {tab === "facilities" && (
            <TabPanel idBase="safety" id="facilities">
              <section className="ui-section" aria-labelledby="facilities-heading">
                <SectionHeading
                  id="facilities-heading"
                  icon={SECTION_ICON.facilities}
                  title={SECTION_TITLE.facilities}
                />

                <div className="safety-filter" role="group" aria-label="Filter by status">
                  {FILTER_STATUSES.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`safety-filter__btn${
                        status === f ? " safety-filter__btn--active" : ""
                      }`}
                      aria-pressed={status === f}
                      onClick={() => setStatus(f)}
                    >
                      {f === "all" ? "All" : FACILITY_TONE[f].label}
                      <span className="safety-filter__count">
                        {f === "all"
                          ? facilityReports.length
                          : facilityReports.filter((r) => r.status === f).length}
                      </span>
                    </button>
                  ))}
                </div>

                {facilityReports.length === 0 ? (
                  <p className="ui-page-subtitle">No facility problems have been reported.</p>
                ) : (
                  <>
                    <div className="ui-stack" role="list">
                      {filteredFacilities.map((r) => {
                        const s = FACILITY_TONE[r.status];
                        return (
                          <Drawer
                            key={r.id}
                            className="safety-card safety-card--drawer"
                            ariaLabel={`Facility report: ${r.title}`}
                            label={r.title}
                            open={openFacility === r.id}
                            onToggle={() => setOpenFacility((cur) => (cur === r.id ? null : r.id))}
                            header={
                              <div className="safety-card__row m-0">
                                <div className="flex-fill">
                                  <p className="safety-card__location">{r.title}</p>
                                  <p className="safety-card__meta">
                                    <MapPin
                                      className="icon-inline"
                                      size={12}
                                      strokeWidth={2}
                                      aria-hidden="true"
                                    />
                                    {r.area}
                                  </p>
                                </div>
                                <span className={`safety-chip-tone tone-${s.tone}`}>{s.label}</span>
                              </div>
                            }
                          >
                            <p className="safety-card__description">{r.description}</p>
                            <div className="safety-card__footer">
                              <span className="safety-card__category">{r.category}</span>
                              <span className="safety-card__meta">
                                Reported {formatWhen(r.reportedAt)}
                                {r.status !== "reported" && ` · Updated ${formatWhen(r.updatedAt)}`}
                              </span>
                            </div>
                          </Drawer>
                        );
                      })}
                    </div>

                    <div className="safety-facility-summary">
                      {FACILITY_STATUSES.map((s) => {
                        const c = FACILITY_TONE[s];
                        const count = facilityReports.filter((r) => r.status === s).length;
                        return (
                          <div key={s} className={`safety-facility-summary__item tone-${c.tone}`}>
                            <span className="safety-facility-summary__count">{count}</span>
                            <span className="safety-facility-summary__label">{c.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            </TabPanel>
          )}
        </>
      )}
    </>
  );
}
