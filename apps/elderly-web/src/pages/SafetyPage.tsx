import { useId, useState, type ReactNode } from "react";
import {
  HAZE_DATA,
  WATER_LEVELS,
  TEMPERATURE_DATA,
  FACILITY_REPORTS,
  type HazardLevel,
  type WaterStatus,
  type AlertLevel,
  type FacilityStatus,
} from "../mock/safetyData";
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
import { SegmentedTabs, TabPanel } from "../ui/SegmentedTabs";
import { useAccessibility } from "../context/AccessibilityContext";

type SafetyTab = "haze" | "water" | "temp" | "facilities";

/* ── Colour helpers ──────────────────────────────────── */
const HAZARD_COLOR: Record<HazardLevel, { bg: string; text: string; label: string }> = {
  good:      { bg: "#D1FAE5", text: "#065F46", label: "Good" },
  moderate:  { bg: "#FEF9C3", text: "#713F12", label: "Moderate" },
  unhealthy: { bg: "#FEE2E2", text: "#991B1B", label: "Unhealthy" },
  hazardous: { bg: "#4B0082", text: "#fff",    label: "Hazardous" },
};

const WATER_COLOR: Record<WaterStatus, { bg: string; text: string; label: string }> = {
  normal:  { bg: "#D1FAE5", text: "#065F46", label: "Normal" },
  watch:   { bg: "#FEF9C3", text: "#713F12", label: "Watch" },
  warning: { bg: "#FEE2E2", text: "#991B1B", label: "Warning" },
  danger:  { bg: "#991B1B", text: "#fff",    label: "Danger" },
};

const ALERT_COLOR: Record<AlertLevel, { bg: string; text: string; label: string }> = {
  normal:  { bg: "#D1FAE5", text: "#065F46", label: "Normal" },
  warning: { bg: "#FEF9C3", text: "#713F12", label: "Heat Advisory" },
  danger:  { bg: "#FEE2E2", text: "#991B1B", label: "Extreme Heat" },
};

const FACILITY_COLOR: Record<FacilityStatus, { bg: string; text: string; label: string }> = {
  reported:    { bg: "#FEE2E2", text: "#991B1B", label: "Reported" },
  in_progress: { bg: "#FEF9C3", text: "#713F12", label: "In Progress" },
  fixed:       { bg: "#D1FAE5", text: "#065F46", label: "Fixed" },
};

type FilterStatus = "all" | FacilityStatus;

/** Section heading with Apple design optical typography and outline icon */
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

/**
 * Health & Safety Hazards page with Apple Design and Silver Generation Accessibility.
 * Sections:
 * a. Haze API
 * b. Water Level of Rivers and Lakes within the township
 * c. Temperature Alerts
 * d. Broken or Damaged Facilities within the Township (Reported, In progress, Fixed)
 */
export function SafetyPage() {
  const [facilityFilter, setFacilityFilter] = useState<FilterStatus>("all");
  const [tab, setTab] = useState<SafetyTab>("haze");
  const groupId = useId();
  const { speak, triggerHaptic } = useAccessibility();

  const TABS = [
    { id: "haze", label: "Air", icon: <IconWind size={18} strokeWidth={2} /> },
    { id: "water", label: "Water", icon: <IconWaves size={18} strokeWidth={2} /> },
    { id: "temp", label: "Heat", icon: <IconThermometer size={18} strokeWidth={2} /> },
    { id: "facilities", label: "Facilities", icon: <IconWrench size={18} strokeWidth={2} /> },
  ];

  const filteredFacilities =
    facilityFilter === "all"
      ? FACILITY_REPORTS
      : FACILITY_REPORTS.filter((f) => f.status === facilityFilter);

  const tempStyle = ALERT_COLOR[TEMPERATURE_DATA.level];

  function handleReadSafetySummary() {
    speak(
      "Health and safety hazard report for Elmina West. Air Pollutant Index is currently 58, moderate air quality. River and lake water levels are normal. Temperature is 35 degrees with a heat advisory in effect. There are currently " +
        FACILITY_REPORTS.filter((f) => f.status !== "fixed").length +
        " open facility repairs being handled by township maintenance.",
    );
  }

  function handleFilterClick(status: FilterStatus) {
    triggerHaptic(12);
    setFacilityFilter(status);
  }

  return (
    <div className="safety-page">
      {/* ── Apple-style Frosted Header with Voice Trigger ───── */}
      <div className="safety-page__header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 className="safety-page__title">Health &amp; Safety</h1>
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

      {/* ── Segmented tabs: one hazard category at a time ──── */}
      <SegmentedTabs
        tabs={TABS}
        active={tab}
        onChange={(id) => setTab(id as SafetyTab)}
        ariaLabel="Choose a safety category"
      />

      {/* ── 1. Haze / Air Quality API ─────────────────────── */}
      {tab === "haze" && (
      <TabPanel id="haze" groupId={groupId}>
      <section className="safety-section seg-panel-enter" aria-labelledby="haze-heading" id="haze">
        <SectionHeading
          icon={<IconWind size={22} strokeWidth={1.8} />}
          title="Air Quality &amp; Haze API"
        />
        <div className="ui-stack">
          {HAZE_DATA.map((r) => {
            const s = HAZARD_COLOR[r.level];
            const pct = Math.min((r.api / 300) * 100, 100);
            return (
              <div key={r.location} className="safety-card">
                <div className="safety-card__row">
                  <div>
                    <p className="safety-card__location">{r.location}</p>
                    <p className="safety-card__meta">Updated: {r.updatedAt}</p>
                  </div>
                  <div className="safety-card__badge" style={{ background: s.bg, color: s.text }}>
                    <span className="safety-card__badge-value">{r.api}</span>
                    <span className="safety-card__badge-label">API · {s.label}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="safety-bar" aria-label={`API level ${r.api} out of 300`}>
                  <div
                    className="safety-bar__fill"
                    style={{ width: `${pct}%`, background: s.text }}
                  />
                </div>
                <p className="safety-card__tip">
                  <IconInfo size={14} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  {r.recommendation}
                </p>
              </div>
            );
          })}
        </div>
        <p className="safety-source">Source: Department of Environment Malaysia (DoE) · API Mock</p>
      </section>
      </TabPanel>
      )}

      {/* ── 2. Water Levels of Rivers and Lakes ────────────── */}
      {tab === "water" && (
      <TabPanel id="water" groupId={groupId}>
      <section className="safety-section seg-panel-enter" aria-labelledby="water-heading">
        <SectionHeading
          icon={<IconWaves size={22} strokeWidth={1.8} />}
          title="River &amp; Lake Water Levels"
        />
        <div className="ui-stack">
          {WATER_LEVELS.map((r) => {
            const s = WATER_COLOR[r.status];
            const pct = Math.min((r.levelM / r.normalMaxM) * 100, 100);
            return (
              <div key={r.name} className="safety-card">
                <div className="safety-card__row">
                  <div>
                    <p className="safety-card__location">{r.name}</p>
                    <p className="safety-card__meta">
                      {r.type === "river" ? "River gauge" : "Lake retention basin"} · {r.levelM} m / {r.normalMaxM} m normal max · {r.updatedAt}
                    </p>
                  </div>
                  <span className="safety-chip" style={{ background: s.bg, color: s.text }}>
                    {s.label}
                  </span>
                </div>
                <div className="safety-bar" aria-label={`Water level ${r.levelM}m of ${r.normalMaxM}m`}>
                  <div
                    className="safety-bar__fill"
                    style={{
                      width: `${pct}%`,
                      background: pct > 85 ? "#991B1B" : pct > 70 ? "#D97706" : "#15803D",
                    }}
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

      {/* ── 3. Temperature Alerts ─────────────────────────── */}
      {tab === "temp" && (
      <TabPanel id="temp" groupId={groupId}>
      <section className="safety-section seg-panel-enter" aria-labelledby="temp-heading" id="temp">
        <SectionHeading
          icon={<IconThermometer size={22} strokeWidth={1.8} />}
          title="Temperature Alerts"
        />
        <div
          className="safety-card safety-card--temperature"
          style={{ borderColor: TEMPERATURE_DATA.level === "normal" ? undefined : "#F59E0B" }}
        >
          <div className="safety-temp__main">
            <div className="safety-temp__reading">
              <span className="safety-temp__value">{TEMPERATURE_DATA.tempC}°C</span>
              <span
                className="safety-chip"
                style={{ background: tempStyle.bg, color: tempStyle.text }}
              >
                {tempStyle.label}
              </span>
            </div>
            <p className="safety-card__meta">
              <IconMapPin size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              {TEMPERATURE_DATA.location} · {TEMPERATURE_DATA.updatedAt}
            </p>
          </div>
          <div className="safety-temp__stats">
            <div className="safety-temp__stat">
              <span className="safety-temp__stat-label">Feels like</span>
              <span className="safety-temp__stat-value">{TEMPERATURE_DATA.feelsLikeC}°C</span>
            </div>
            <div className="safety-temp__stat">
              <span className="safety-temp__stat-label">Humidity</span>
              <span className="safety-temp__stat-value">{TEMPERATURE_DATA.humidity}%</span>
            </div>
          </div>
          {TEMPERATURE_DATA.advisory && (
            <div className="safety-advisory">
              <IconAlertTriangle size={16} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              {TEMPERATURE_DATA.advisory}
            </div>
          )}
        </div>
        <p className="safety-source">Source: Malaysia Meteorological Dept · Mock data</p>
      </section>
      </TabPanel>
      )}

      {/* ── 4. Broken or Damaged Facilities within Township ─── */}
      {tab === "facilities" && (
      <TabPanel id="facilities" groupId={groupId}>
      <section className="safety-section seg-panel-enter" aria-labelledby="facilities-heading" id="facilities">
        <SectionHeading
          icon={<IconWrench size={22} strokeWidth={1.8} />}
          title="Facility Reports (Reported · In Progress · Fixed)"
        />

        {/* Filter tabs - Apple Segmented Style */}
        <div className="safety-filter" role="group" aria-label="Filter by status">
          {(["all", "reported", "in_progress", "fixed"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`safety-filter__btn${facilityFilter === f ? " safety-filter__btn--active" : ""}`}
              onClick={() => handleFilterClick(f)}
            >
              {f === "all" ? "All" : FACILITY_COLOR[f].label}
              <span className="safety-filter__count">
                {f === "all"
                  ? FACILITY_REPORTS.length
                  : FACILITY_REPORTS.filter((r) => r.status === f).length}
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
                  <div style={{ flex: 1 }}>
                    <p className="safety-card__location">{r.title}</p>
                    <p className="safety-card__meta">
                      <IconMapPin size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                      {r.location}
                    </p>
                  </div>
                  <span className="safety-chip" style={{ background: s.bg, color: s.text }}>
                    {s.label}
                  </span>
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

        {/* Summary counts */}
        <div className="safety-facility-summary">
          {(["reported", "in_progress", "fixed"] as FacilityStatus[]).map((s) => {
            const c = FACILITY_COLOR[s];
            const count = FACILITY_REPORTS.filter((r) => r.status === s).length;
            return (
              <div
                key={s}
                className="safety-facility-summary__item"
                style={{ background: c.bg, color: c.text }}
              >
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
