import { useId, useState, type ReactNode } from "react";
import type { FacilityStatus } from "@sdh/contracts";
import { useSafetyData } from "../hooks/useSafetyData";
import { useResident } from "../session/useResident";
import { formatWhen } from "../requests/schedule";
import { formatTemperature, withUnit } from "../safety/format";
import { Banner } from "../ui/Banner";
import { Spinner } from "../ui/Spinner";
import {
  IconWind,
  IconWaves,
  IconThermometer,
  IconWrench,
  IconAlertTriangle,
  IconMapPin,
  IconInfo,
} from "../ui/Icons";
import { SegmentedTabs, TabPanel, type TabItem } from "../ui/SegmentedTabs";
import { Drawer } from "../ui/Drawer";
import { PageHeaderActions } from "../ui/PageHeaderActions";
import { useAccessibility } from "../context/AccessibilityContext";
import { useHashTab } from "../ui/useHashTab";
import {
  ALERT_LEVEL,
  FACILITY_STATUS,
  HAZARD_LEVEL,
  HAZE_API_SCALE_MAX,
  WATER_STATUS,
} from "../safety/levels";
import { EmergencyCallButton } from "../ui/EmergencyCallButton";

type SafetyTab = "haze" | "water" | "temp" | "facilities";
const SAFETY_TABS: readonly SafetyTab[] = ["haze", "water", "temp", "facilities"];

// Water bar turns amber, then red, as the level nears the normal maximum.
const WATER_WARN_PCT = 70;
const WATER_HIGH_PCT = 85;
function waterBarLevel(pct: number): "ok" | "mid" | "high" {
  if (pct > WATER_HIGH_PCT) return "high";
  return pct > WATER_WARN_PCT ? "mid" : "ok";
}

type FilterStatus = "all" | FacilityStatus;
const FACILITY_STATUSES: FacilityStatus[] = ["reported", "in_progress", "resolved"];
const FILTER_STATUSES: FilterStatus[] = ["all", ...FACILITY_STATUSES];

// Section heading with an outline icon. The id is what the section's aria-labelledby points to.
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

// Health & Safety Hazards page.
// Sections:
// a. Haze API
// b. Water Level of Rivers and Lakes within the township
// c. Temperature Alerts
// d. Broken or Damaged Facilities within the Township (Reported, In progress, Fixed)
// Everything shown comes from the township feed; nothing is made up on the phone.
export function SafetyPage() {
  const safety = useSafetyData();
  const resident = useResident();
  const { air: airReadings, water: waterReadings, heat: heatReadings } = safety;
  const facilityReports = safety.facilities;
  const [facilityFilter, setFacilityFilter] = useState<FilterStatus>("all");
  const [openFacility, setOpenFacility] = useState<string | null>(null);
  const [tab, setTab] = useHashTab<SafetyTab>(SAFETY_TABS, "haze");
  const groupId = useId();
  const { speak, triggerHaptic } = useAccessibility();

  const TABS: TabItem<SafetyTab>[] = [
    { id: "haze", label: "Air", icon: <IconWind size={18} strokeWidth={2} /> },
    { id: "water", label: "Water", icon: <IconWaves size={18} strokeWidth={2} /> },
    { id: "temp", label: "Heat", icon: <IconThermometer size={18} strokeWidth={2} /> },
    { id: "facilities", label: "Facilities", icon: <IconWrench size={18} strokeWidth={2} /> },
  ];

  const filteredFacilities =
    facilityFilter === "all"
      ? facilityReports
      : facilityReports.filter((f) => f.status === facilityFilter);

  function handleReadSafetySummary() {
    const open = facilityReports.filter((f) => f.status !== "resolved").length;
    const parts = ["Health and safety."];
    const air = airReadings[0];
    if (air) {
      parts.push(
        `Air quality in ${air.area} is ${HAZARD_LEVEL[air.level].label}, API ${air.value}.`,
      );
    }
    const heat = heatReadings[0];
    if (heat) {
      parts.push(
        `Temperature is ${formatTemperature(heat.value, heat.unit)}, ${ALERT_LEVEL[heat.level].label}.`,
      );
    }
    parts.push(`${open} facility repairs are not yet fixed.`);
    speak(parts.join(" "));
  }

  function handleFilterClick(status: FilterStatus) {
    triggerHaptic(12);
    setFacilityFilter(status);
  }

  return (
    <div className="safety-page">
      <div className="safety-page__header">
        <div className="row-between">
          <div>
            <h1 className="safety-page__title">Health &amp; Safety</h1>
            <p className="safety-page__subtitle">
              {resident?.area ?? "Elmina"} · Township Hazard Monitoring
            </p>
          </div>
          <PageHeaderActions onReadAloud={handleReadSafetySummary} />
        </div>
      </div>

      <div className="safety-page__call">
        <EmergencyCallButton compact />
      </div>

      {safety.status === "loading" && !safety.loaded ? <Spinner label="Loading readings" /> : null}
      {safety.status === "error" ? (
        <Banner
          message={safety.error?.message ?? "We could not load the readings."}
          onRetry={safety.refetch}
        />
      ) : null}

      <SegmentedTabs
        groupId={groupId}
        tabs={TABS}
        active={tab}
        onChange={setTab}
        ariaLabel="Choose a safety category"
      />

      {tab === "haze" && (
        <TabPanel id="haze" groupId={groupId}>
          <section
            className="safety-section seg-panel-enter"
            aria-labelledby="haze-heading"
            id="haze"
          >
            <SectionHeading
              id="haze-heading"
              icon={<IconWind size={22} strokeWidth={1.8} />}
              title="Air Quality &amp; Haze API"
            />
            <div className="ui-stack">
              {airReadings.length === 0 && safety.loaded ? (
                <p className="ui-page-subtitle">No air quality readings have been posted yet.</p>
              ) : null}
              {airReadings.map((r) => {
                const s = HAZARD_LEVEL[r.level];
                const pct = Math.min((r.value / HAZE_API_SCALE_MAX) * 100, 100);
                return (
                  <div key={r.area} className="safety-card">
                    <div className="safety-card__row">
                      <div>
                        <p className="safety-card__location">{r.area}</p>
                        <p className="safety-card__meta">Updated: {formatWhen(r.measuredAt)}</p>
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
                      <IconInfo className="icon-inline-low" size={14} strokeWidth={2} />
                      {r.advice}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </TabPanel>
      )}

      {tab === "water" && (
        <TabPanel id="water" groupId={groupId}>
          <section className="safety-section seg-panel-enter" aria-labelledby="water-heading">
            <SectionHeading
              id="water-heading"
              icon={<IconWaves size={22} strokeWidth={1.8} />}
              title="River &amp; Lake Water Levels"
            />
            <div className="ui-stack">
              {waterReadings.length === 0 && safety.loaded ? (
                <p className="ui-page-subtitle">No water level readings have been posted yet.</p>
              ) : null}
              {waterReadings.map((r) => {
                const s = WATER_STATUS[r.level];
                const pct = Math.min((r.value / r.normalMax) * 100, 100);
                return (
                  <div key={`${r.name}-${r.area}`} className="safety-card">
                    <div className="safety-card__row">
                      <div>
                        <p className="safety-card__location">{r.name}</p>
                        <p className="safety-card__meta">
                          {r.waterBody === "river" ? "River gauge" : "Lake"} ·{" "}
                          {withUnit(r.value, r.unit)} / {withUnit(r.normalMax, r.unit)} normal max ·{" "}
                          {formatWhen(r.measuredAt)}
                        </p>
                      </div>
                      <span className={`safety-chip tone-${s.tone}`}>{s.label}</span>
                    </div>
                    <div
                      className="safety-bar"
                      aria-label={`Water level ${withUnit(r.value, r.unit)} of ${withUnit(r.normalMax, r.unit)}`}
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
          </section>
        </TabPanel>
      )}

      {tab === "temp" && (
        <TabPanel id="temp" groupId={groupId}>
          <section
            className="safety-section seg-panel-enter"
            aria-labelledby="temp-heading"
            id="temp"
          >
            <SectionHeading
              id="temp-heading"
              icon={<IconThermometer size={22} strokeWidth={1.8} />}
              title="Temperature Alerts"
            />
            {heatReadings.length === 0 && safety.loaded ? (
              <p className="ui-page-subtitle">No temperature readings have been posted yet.</p>
            ) : null}
            <div className="ui-stack">
              {heatReadings.map((t) => {
                const style = ALERT_LEVEL[t.level];
                return (
                  <div
                    key={t.area}
                    className={`safety-card safety-card--temperature${t.level === "normal" ? "" : " safety-card--alert"}`}
                  >
                    <div className="safety-temp__main">
                      <div className="safety-temp__reading">
                        <span className="safety-temp__value">
                          {formatTemperature(t.value, t.unit)}
                        </span>
                        <span className={`safety-chip tone-${style.tone}`}>{style.label}</span>
                      </div>
                      <p className="safety-card__meta">
                        <IconMapPin className="icon-inline" size={12} strokeWidth={2} />
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
                      <IconAlertTriangle className="icon-inline-low" size={16} strokeWidth={2} />
                      {t.advice}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </TabPanel>
      )}

      {tab === "facilities" && (
        <TabPanel id="facilities" groupId={groupId}>
          <section
            className="safety-section seg-panel-enter"
            aria-labelledby="facilities-heading"
            id="facilities"
          >
            <SectionHeading
              id="facilities-heading"
              icon={<IconWrench size={22} strokeWidth={1.8} />}
              title="Facility Reports (Reported · In Progress · Fixed)"
            />

            <div className="safety-filter" role="group" aria-label="Filter by status">
              {FILTER_STATUSES.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`safety-filter__btn${facilityFilter === f ? " safety-filter__btn--active" : ""}`}
                  onClick={() => handleFilterClick(f)}
                  aria-pressed={facilityFilter === f}
                >
                  {f === "all" ? "All" : FACILITY_STATUS[f].label}
                  <span className="safety-filter__count">
                    {f === "all"
                      ? facilityReports.length
                      : facilityReports.filter((r) => r.status === f).length}
                  </span>
                </button>
              ))}
            </div>

            {facilityReports.length === 0 && safety.loaded ? (
              <p className="ui-page-subtitle">No facility problems have been reported.</p>
            ) : null}
            <div className="ui-stack">
              {filteredFacilities.map((r) => {
                const s = FACILITY_STATUS[r.status];
                return (
                  <Drawer
                    key={r.id}
                    className="safety-card safety-card--drawer"
                    label={r.title}
                    open={openFacility === r.id}
                    onToggle={() => {
                      triggerHaptic(10);
                      setOpenFacility((cur) => (cur === r.id ? null : r.id));
                    }}
                    header={
                      <div className="safety-card__row m-0">
                        <div className="flex-fill">
                          <p className="safety-card__location">{r.title}</p>
                          <p className="safety-card__meta">
                            <IconMapPin className="icon-inline" size={12} strokeWidth={2} />
                            {r.area}
                          </p>
                        </div>
                        <span className={`safety-chip tone-${s.tone}`}>{s.label}</span>
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
                const c = FACILITY_STATUS[s];
                const count = facilityReports.filter((r) => r.status === s).length;
                return (
                  <div key={s} className={`safety-facility-summary__item tone-${c.tone}`}>
                    <span className="safety-facility-summary__count">{count}</span>
                    <span className="safety-facility-summary__label">{c.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </TabPanel>
      )}
    </div>
  );
}
