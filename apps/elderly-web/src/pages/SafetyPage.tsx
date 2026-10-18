import { useId, useState, type ReactNode } from "react";
import { useSafetyData } from "../hooks/useSafetyData";
import type { AlertLevel, FacilityStatus, HazardLevel, WaterStatus } from "../types/safety";
import {
  IconWind,
  IconWaves,
  IconThermometer,
  IconWrench,
  IconAlertTriangle,
  IconMapPin,
  IconInfo,
  IconVolume2,
} from "../ui/Icons";
import { SegmentedTabs, TabPanel, type TabItem } from "../ui/SegmentedTabs";
import { useAccessibility } from "../context/AccessibilityContext";
import { DemoTag } from "../ui/DemoTag";
import { HAZE_API_SCALE_MAX } from "../ui/status";

type SafetyTab = "haze" | "water" | "temp" | "facilities";

// ── Colour helpers ────────────────────────────────────
type Tone = "good" | "caution" | "alert" | "extreme" | "solid-danger";
type ToneLabel = { tone: Tone; label: string };

const HAZARD_COLOR: Record<HazardLevel, ToneLabel> = {
  good: { tone: "good", label: "Good" },
  moderate: { tone: "caution", label: "Moderate" },
  unhealthy: { tone: "alert", label: "Unhealthy" },
  hazardous: { tone: "extreme", label: "Hazardous" },
};

const WATER_COLOR: Record<WaterStatus, ToneLabel> = {
  normal: { tone: "good", label: "Normal" },
  watch: { tone: "caution", label: "Watch" },
  warning: { tone: "alert", label: "Warning" },
  danger: { tone: "solid-danger", label: "Danger" },
};

const ALERT_COLOR: Record<AlertLevel, ToneLabel> = {
  normal: { tone: "good", label: "Normal" },
  warning: { tone: "caution", label: "Heat Advisory" },
  danger: { tone: "alert", label: "Extreme Heat" },
};

const FACILITY_COLOR: Record<FacilityStatus, ToneLabel> = {
  reported: { tone: "alert", label: "Reported" },
  in_progress: { tone: "caution", label: "In Progress" },
  fixed: { tone: "good", label: "Fixed" },
};

// Water bar turns amber, then red, as the level nears the normal maximum.
const WATER_WARN_PCT = 70;
const WATER_HIGH_PCT = 85;
function waterBarLevel(pct: number): "ok" | "mid" | "high" {
  if (pct > WATER_HIGH_PCT) return "high";
  return pct > WATER_WARN_PCT ? "mid" : "ok";
}

type FilterStatus = "all" | FacilityStatus;
const FACILITY_STATUSES: FacilityStatus[] = ["reported", "in_progress", "fixed"];
const FILTER_STATUSES: FilterStatus[] = ["all", ...FACILITY_STATUSES];

// Section heading with Apple design optical typography and outline icon
function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="safety-section__heading">
      <span className="safety-section__heading-icon" aria-hidden="true">
        {icon}
      </span>
      <h2 className="safety-section__heading-text">{title}</h2>
    </div>
  );
}

// Health & Safety Hazards page with Apple Design and Silver Generation Accessibility.
// Sections:
// a. Haze API
// b. Water Level of Rivers and Lakes within the township
// c. Temperature Alerts
// d. Broken or Damaged Facilities within the Township (Reported, In progress, Fixed)
export function SafetyPage() {
  const { hazeReadings, waterReadings, temperatureAlert, facilityReports } = useSafetyData();
  const [facilityFilter, setFacilityFilter] = useState<FilterStatus>("all");
  const [tab, setTab] = useState<SafetyTab>("haze");
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

  const tempStyle = ALERT_COLOR[temperatureAlert.level];
  const localHaze = hazeReadings[0] ?? { location: "Elmina West", level: "good", api: 0 };

  function handleReadSafetySummary() {
    const open = facilityReports.filter((f) => f.status !== "fixed").length;
    speak(
      `Health and safety. These are example readings, not live data. Air quality in ${localHaze.location} is ${localHaze.level}, API ${localHaze.api}. ` +
        `Temperature is ${temperatureAlert.tempC} degrees, ${tempStyle.label}. ` +
        `${open} facility repairs are not yet fixed.`,
    );
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
            <h1 className="safety-page__title">
              Health &amp; Safety
              <DemoTag />
            </h1>
            <p className="safety-page__subtitle">Elmina West · Township Hazard Monitoring</p>
          </div>
          <button
            type="button"
            className="ui-button ui-button--ghost apple-header-voice-btn"
            onClick={handleReadSafetySummary}
            aria-label="Read safety hazard summary aloud"
            title="Read summary aloud"
          >
            <IconVolume2 size={18} strokeWidth={2.2} />
            <span className="apple-header-voice-text">Listen</span>
          </button>
        </div>
      </div>

      <SegmentedTabs
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
              icon={<IconWind size={22} strokeWidth={1.8} />}
              title="Air Quality &amp; Haze API"
            />
            <div className="ui-stack">
              {hazeReadings.map((r) => {
                const s = HAZARD_COLOR[r.level];
                const pct = Math.min((r.api / HAZE_API_SCALE_MAX) * 100, 100);
                return (
                  <div key={r.location} className="safety-card">
                    <div className="safety-card__row">
                      <div>
                        <p className="safety-card__location">{r.location}</p>
                        <p className="safety-card__meta">Updated: {r.updatedAt}</p>
                      </div>
                      <div className={`safety-card__badge tone-${s.tone}`}>
                        <span className="safety-card__badge-value">{r.api}</span>
                        <span className="safety-card__badge-label">API · {s.label}</span>
                      </div>
                    </div>
                    <div
                      className="safety-bar"
                      aria-label={`API level ${r.api} out of ${HAZE_API_SCALE_MAX}`}
                    >
                      <div
                        className={`safety-bar__fill safety-bar__fill--tone tone-${s.tone}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="safety-card__tip">
                      <IconInfo className="icon-inline-low" size={14} strokeWidth={2} />
                      {r.recommendation}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="safety-source">
              Source: Department of Environment Malaysia (DoE) · API Mock
            </p>
          </section>
        </TabPanel>
      )}

      {tab === "water" && (
        <TabPanel id="water" groupId={groupId}>
          <section className="safety-section seg-panel-enter" aria-labelledby="water-heading">
            <SectionHeading
              icon={<IconWaves size={22} strokeWidth={1.8} />}
              title="River &amp; Lake Water Levels"
            />
            <div className="ui-stack">
              {waterReadings.map((r) => {
                const s = WATER_COLOR[r.status];
                const pct = Math.min((r.levelM / r.normalMaxM) * 100, 100);
                return (
                  <div key={r.name} className="safety-card">
                    <div className="safety-card__row">
                      <div>
                        <p className="safety-card__location">{r.name}</p>
                        <p className="safety-card__meta">
                          {r.type === "river" ? "River gauge" : "Lake retention basin"} · {r.levelM}{" "}
                          m / {r.normalMaxM} m normal max · {r.updatedAt}
                        </p>
                      </div>
                      <span className={`safety-chip tone-${s.tone}`}>{s.label}</span>
                    </div>
                    <div
                      className="safety-bar"
                      aria-label={`Water level ${r.levelM}m of ${r.normalMaxM}m`}
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
            <p className="safety-source">Source: DID Malaysia Township Gauges · Mock data</p>
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
              icon={<IconThermometer size={22} strokeWidth={1.8} />}
              title="Temperature Alerts"
            />
            <div
              className={`safety-card safety-card--temperature${temperatureAlert.level === "normal" ? "" : " safety-card--alert"}`}
            >
              <div className="safety-temp__main">
                <div className="safety-temp__reading">
                  <span className="safety-temp__value">{temperatureAlert.tempC}°C</span>
                  <span className={`safety-chip tone-${tempStyle.tone}`}>{tempStyle.label}</span>
                </div>
                <p className="safety-card__meta">
                  <IconMapPin className="icon-inline" size={12} strokeWidth={2} />
                  {temperatureAlert.location} · {temperatureAlert.updatedAt}
                </p>
              </div>
              <div className="safety-temp__stats">
                <div className="safety-temp__stat">
                  <span className="safety-temp__stat-label">Feels like</span>
                  <span className="safety-temp__stat-value">{temperatureAlert.feelsLikeC}°C</span>
                </div>
                <div className="safety-temp__stat">
                  <span className="safety-temp__stat-label">Humidity</span>
                  <span className="safety-temp__stat-value">{temperatureAlert.humidity}%</span>
                </div>
              </div>
              {temperatureAlert.advisory && (
                <div className="safety-advisory">
                  <IconAlertTriangle
                    size={16}
                    strokeWidth={2}
                    style={{ verticalAlign: "-2px", marginRight: 6 }}
                  />
                  {temperatureAlert.advisory}
                </div>
              )}
            </div>
            <p className="safety-source">Source: Malaysia Meteorological Dept · Mock data</p>
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
                >
                  {f === "all" ? "All" : FACILITY_COLOR[f].label}
                  <span className="safety-filter__count">
                    {f === "all"
                      ? facilityReports.length
                      : facilityReports.filter((r) => r.status === f).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="ui-stack">
              {filteredFacilities.map((r) => {
                const s = FACILITY_COLOR[r.status];
                return (
                  <div key={r.id} className="safety-card">
                    <div className="safety-card__row">
                      <div className="flex-fill">
                        <p className="safety-card__location">{r.title}</p>
                        <p className="safety-card__meta">
                          <IconMapPin className="icon-inline" size={12} strokeWidth={2} />
                          {r.location}
                        </p>
                      </div>
                      <span className={`safety-chip tone-${s.tone}`}>{s.label}</span>
                    </div>
                    <p className="safety-card__description">{r.description}</p>
                    <div className="safety-card__footer">
                      <span className="safety-card__category">{r.category}</span>
                      <span className="safety-card__meta">
                        Reported {r.reportedAt}
                        {r.status !== "reported" && ` · Updated ${r.updatedAt}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="safety-facility-summary">
              {FACILITY_STATUSES.map((s) => {
                const c = FACILITY_COLOR[s];
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
