import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { HeroHeader } from "../ui/HeroHeader";
import { Carousel } from "../ui/Carousel";
import { RequestCard } from "../ui/RequestCard";
import { useMyRequests } from "../hooks/useRequests";
import { CATEGORY_OPTIONS } from "../requests/categories";
import { formatWhen } from "../requests/schedule";
import { CategoryIcon } from "../ui/CategoryIcon";
import { Spinner } from "../ui/Spinner";
import { Banner } from "../ui/Banner";
import { useResident } from "../session/useResident";
import {
  IconWind,
  IconThermometer,
  IconAlertTriangle,
  IconWrench,
  IconPlus,
  IconList,
  IconChevronRight,
  IconMapPin,
  IconClock,
} from "../ui/Icons";
import {
  STATUS_TEXT,
  STATUS_TONE,
  SEVERITY_SCALE,
  apiSeverity,
  tempSeverity,
  facilitySeverity,
  type Severity,
} from "../ui/status";
import type { CSSProperties } from "react";
import {
  HAZE_DATA,
  TEMPERATURE_DATA,
  FACILITY_REPORTS,
} from "../mock/safetyData";
import { MAINTENANCE_ANNOUNCEMENTS } from "../mock/communityData";

/** Short chip labels for the live-condition carousel cards. */
const HAZE_LABEL: Record<string, string> = {
  good: "Good",
  moderate: "Moderate",
  unhealthy: "Unhealthy",
  hazardous: "Hazardous",
};
const TEMP_LABEL: Record<string, string> = {
  normal: "Normal",
  warning: "Heat Advisory",
  danger: "Extreme Heat",
};
const FACILITY_LABEL: Record<string, string> = {
  reported: "Reported",
  in_progress: "In Progress",
  fixed: "Fixed",
};

/**
 * Home page — Apple Design mobile-first dashboard for Silver Generation.
 * Displays:
 * 1. Red hero header with greeting, resident location & Voice read-aloud assist
 * 2. Township Live Hazard & Facility conditions (Haze API, Temperature Alert, Maintenance Notice, Facility Damage)
 * 3. Help a Neighbour primary call-to-action
 * 4. 5 Daily Support Pillars for Elderly
 * 5. Recent help requests
 */
export function HomePage() {
  const navigate = useNavigate();
  const { data, status, error, refetch } = useMyRequests();
  const resident = useResident();

  // Local township data for Elmina West. Under noUncheckedIndexedAccess these
  // lookups are typed as possibly undefined, so each card below renders only
  // when its datum exists.
  const localHaze = HAZE_DATA.find((h) => h.location === "Elmina West") ?? HAZE_DATA[0];
  const localMaintenance = MAINTENANCE_ANNOUNCEMENTS[0];
  const localFacilityDamage =
    FACILITY_REPORTS.find((f) => f.status === "in_progress") ?? FACILITY_REPORTS[0];

  // Severity → CSS custom properties so each card's chip, bar and left
  // accent stripe all follow one colour from the shared 5-step ramp
  // (light green → green → yellow → orange → red).
  const sevVars = (sev: Severity): CSSProperties => {
    const s = SEVERITY_SCALE[sev];
    return {
      ["--sev-accent" as string]: s.accent,
      ["--sev-chip-bg" as string]: s.chipBg,
      ["--sev-chip-text" as string]: s.chipText,
    };
  };

  // One condition card per carousel slide (shown one at a time, auto-rolls).
  const conditionSlides: ReactNode[] = [];
  if (localHaze) {
    const sev = apiSeverity(localHaze.api);
    conditionSlides.push(
      <button
        key="haze"
        type="button"
        className="apple-condition-card apple-condition-card--sev"
        data-severity={sev}
        style={sevVars(sev)}
        onClick={() => navigate("/safety#haze")}
      >
        <div className="apple-condition-card__top">
          <span className="apple-condition-card__icon" aria-hidden="true">
            <IconWind size={20} strokeWidth={1.8} />
          </span>
          <span className="safety-chip safety-chip--sm apple-condition-card__chip">
            {HAZE_LABEL[localHaze.level] ?? "Moderate"}
          </span>
        </div>
        <div className="apple-condition-card__main">
          <span className="apple-condition-card__value">{localHaze.api}</span>
          <span className="apple-condition-card__unit">API</span>
        </div>
        <div className="safety-bar">
          <div
            className="safety-bar__fill"
            style={{ width: `${Math.min((localHaze.api / 300) * 100, 100)}%`, background: "var(--sev-accent)" }}
          />
        </div>
        <span className="apple-condition-card__label">Air Quality (Haze)</span>
        <span className="apple-condition-card__sub">Sensitive groups take care</span>
      </button>,
    );
  }
  {
    const sev = tempSeverity(TEMPERATURE_DATA.level);
    conditionSlides.push(
      <button
        key="temp"
        type="button"
        className="apple-condition-card apple-condition-card--sev"
        data-severity={sev}
        style={sevVars(sev)}
        onClick={() => navigate("/safety#temp")}
      >
        <div className="apple-condition-card__top">
          <span className="apple-condition-card__icon" aria-hidden="true">
            <IconThermometer size={20} strokeWidth={1.8} />
          </span>
          <span className="safety-chip safety-chip--sm apple-condition-card__chip">
            {TEMP_LABEL[TEMPERATURE_DATA.level]}
          </span>
        </div>
        <div className="apple-condition-card__main">
          <span className="apple-condition-card__value">{TEMPERATURE_DATA.tempC}°C</span>
          <span className="apple-condition-card__unit">Feels {TEMPERATURE_DATA.feelsLikeC}°</span>
        </div>
        <span className="apple-condition-card__label">Temperature Alert</span>
        <span className="apple-condition-card__sub">Stay hydrated &amp; rest in shade</span>
      </button>,
    );
  }
  if (localMaintenance) {
    // Planned maintenance is informational, not a hazard — keep it calm (sev 2).
    const sev: Severity = 2;
    conditionSlides.push(
      <button
        key="maintenance"
        type="button"
        className="apple-condition-card apple-condition-card--sev"
        data-severity={sev}
        style={sevVars(sev)}
        onClick={() => navigate("/community#maintenance")}
      >
        <div className="apple-condition-card__top">
          <span className="apple-condition-card__icon" aria-hidden="true">
            <IconAlertTriangle size={20} strokeWidth={1.8} />
          </span>
          <span className="safety-chip safety-chip--sm apple-condition-card__chip">
            Maintenance
          </span>
        </div>
        <span className="apple-condition-card__title-line">{localMaintenance.title}</span>
        <span className="apple-condition-card__location">📍 {localMaintenance.affectedArea}</span>
        <span className="apple-condition-card__sub">
          <IconClock size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 2 }} />
          {localMaintenance.dateRange}
        </span>
      </button>,
    );
  }
  if (localFacilityDamage) {
    const sev = facilitySeverity(localFacilityDamage.status);
    conditionSlides.push(
      <button
        key="facility"
        type="button"
        className="apple-condition-card apple-condition-card--sev"
        data-severity={sev}
        style={sevVars(sev)}
        onClick={() => navigate("/safety#facilities")}
      >
        <div className="apple-condition-card__top">
          <span className="apple-condition-card__icon" aria-hidden="true">
            <IconWrench size={20} strokeWidth={1.8} />
          </span>
          <span className="safety-chip safety-chip--sm apple-condition-card__chip">
            {FACILITY_LABEL[localFacilityDamage.status]}
          </span>
        </div>
        <span className="apple-condition-card__title-line">{localFacilityDamage.title}</span>
        <span className="apple-condition-card__location">📍 {localFacilityDamage.location}</span>
        <span className="apple-condition-card__sub">
          Crew dispatched · {localFacilityDamage.category}
        </span>
      </button>,
    );
  }

  return (
    <div className="app-home">
      {/* ── Red hero header with location, Aa control, & voice assist ── */}
      <HeroHeader name={resident?.name ?? ""} location={resident?.area} />

      {/* ── Township Live Conditions (Haze, Temp, Maintenance, Facility) ── */}
      <section className="app-home__section" aria-labelledby="township-conditions-heading">
        <div className="app-home__section-header">
          <div>
            <h2 id="township-conditions-heading" className="app-home__section-title">
              Township Live Conditions
            </h2>
            <p className="app-home__section-subtitle">
              <IconMapPin size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 3 }} />
              Elmina West · Real-time neighbourhood updates
            </p>
          </div>
          <button
            type="button"
            className="app-home__see-all"
            onClick={() => navigate("/safety")}
          >
            All hazards
          </button>
        </div>

        <Carousel ariaLabel="Township live conditions" intervalMs={5000} slides={conditionSlides} />
      </section>

      {/* ── "Need a hand today?" CTA card ───────────────────── */}
      <section className="app-home__section">
        <div className="app-cta-card">
          <h2 className="app-cta-card__title">Need a hand today?</h2>
          <p className="app-cta-card__body">
            A verified neighbour can help with groceries, rides, phones, household fixes and more.
          </p>
          <div className="app-cta-card__actions">
            <button
              type="button"
              className="ui-button ui-button--primary app-cta-card__btn"
              onClick={() => navigate("/request")}
            >
              <IconPlus size={18} strokeWidth={2.4} aria-hidden="true" />
              <span>Request help</span>
            </button>
            <button
              type="button"
              className="ui-button ui-button--secondary app-cta-card__btn--secondary"
              onClick={() => navigate("/requests")}
            >
              <IconList size={18} strokeWidth={2} aria-hidden="true" />
              <span>View my requests</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 5 Daily Support Pillars for Elderly ────────────────── */}
      <section className="app-home__section" aria-labelledby="daily-support-heading">
        <div className="app-home__section-header">
          <h2 id="daily-support-heading" className="app-home__section-title">
            Help a Neighbour Services
          </h2>
          <button
            type="button"
            className="app-home__see-all"
            onClick={() => navigate("/request")}
          >
            All services
          </button>
        </div>

        <div className="daily-support-list">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="daily-support-item"
              onClick={() => navigate(`/request/${cat.id}`)}
            >
              <div className="daily-support-item__icon" aria-hidden="true">
                <CategoryIcon id={cat.id} size={20} />
              </div>
              <div className="daily-support-item__text">
                <span className="daily-support-item__title">{cat.title}</span>
                <span className="daily-support-item__desc">{cat.subtitle}</span>
              </div>
              <span className="daily-support-item__arrow" aria-hidden="true">
                <IconChevronRight size={16} strokeWidth={2} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── My requests ─────────────────────────────────────── */}
      <section className="app-home__section">
        <div className="app-home__section-header">
          <h2 className="app-home__section-title">My requests</h2>
          <button
            type="button"
            className="app-home__see-all"
            onClick={() => navigate("/requests")}
          >
            See all
          </button>
        </div>

        {status === "loading" && <Spinner label="Loading requests" />}

        {status === "error" && (
          <Banner message={error?.message ?? "We could not load your requests."} onRetry={refetch} />
        )}

        {status === "success" && (!data || data.length === 0) && (
          <p className="ui-page-subtitle" style={{ marginTop: 8 }}>
            You have no requests yet.
          </p>
        )}

        {status === "success" && data && data.length > 0 && (
          <div className="ui-stack">
            {data.slice(0, 3).map((req) => (
              <RequestCard
                key={req.id}
                title={req.title}
                date={formatWhen(req.scheduledAt)}
                statusLabel={STATUS_TEXT[req.status]}
                statusVariant={STATUS_TONE[req.status]}
                volunteerName={req.volunteerName}
                onClick={() => navigate(`/requests/${req.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
