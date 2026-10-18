import { CalendarDays, Clock, MapPin, Sparkles } from "lucide-react";

import type { Opportunity } from "../../types/volunteer";
import { TASK_CATEGORY_LABEL, URGENCY_LABEL } from "../../types/volunteer";
import { formatDate, formatTimeRange } from "../../lib/format";
import { approxKm } from "../../lib/geo";
import { AppButton, DemoTag, InfoCard, Pill, StatusBadge } from "../ui";

export type OpportunityCardProps = {
  opportunity: Opportunity;
  /** Live distance (km) computed from the user's location, when available. */
  liveDistanceKm?: number;
  joined: boolean;
  /** True while this card's accept is being saved. */
  accepting?: boolean;
  onAccept: (opportunity: Opportunity) => void;
};

/**
 * One volunteering opportunity: category, urgency, distance, schedule, duration,
 * a rule-based match score and reasons, plus an accept action.
 */
export function OpportunityCard({
  opportunity,
  liveDistanceKm,
  joined,
  accepting = false,
  onAccept,
}: OpportunityCardProps) {
  const distance = liveDistanceKm != null ? approxKm(liveDistanceKm) : opportunity.distanceKm;
  const urgencyVariant =
    opportunity.urgency === "high"
      ? "danger"
      : opportunity.urgency === "medium"
        ? "warning"
        : "info";

  return (
    <InfoCard as="li" ariaLabel={`Opportunity: ${opportunity.title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">{opportunity.title}</h3>
          <Pill>{TASK_CATEGORY_LABEL[opportunity.category]}</Pill>
        </div>

        <div className="ui-chip-row" aria-label="Highlights" style={{ gap: "var(--space-2)" }}>
          <StatusBadge label={URGENCY_LABEL[opportunity.urgency]} variant={urgencyVariant} />
          <span className="match-score" title="How well this fits you">
            <Sparkles size={14} aria-hidden="true" />
            {opportunity.matchScore}% match
          </span>
        </div>

        <div className="ui-stack" style={{ gap: "var(--space-2)" }}>
          <span className="inline-icon">
            <MapPin size={16} className="icon-dim" aria-hidden="true" />
            {opportunity.area} · {distance} km away
          </span>
          <span className="inline-icon">
            <CalendarDays size={16} className="icon-dim" aria-hidden="true" />
            {formatDate(opportunity.scheduledAt)},{" "}
            {formatTimeRange(opportunity.scheduledAt, opportunity.durationMinutes)}
          </span>
          <span className="inline-icon">
            <Clock size={16} className="icon-dim" aria-hidden="true" />
            {opportunity.durationMinutes} min
          </span>
        </div>

        <p className="feature-card-desc">{opportunity.summary}</p>

        {opportunity.reasons.length > 0 && (
          <ul className="match-reasons" aria-label="Why this matches you">
            {opportunity.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}

        <div className="ui-meta-row">
          <span>Source: {opportunity.sourceLabel}</span>
          {opportunity.isDemoData && <DemoTag />}
        </div>

        <div className="feature-card-foot">
          {joined ? (
            <StatusBadge
              label={opportunity.kind === "event" ? "You joined this" : "You accepted this"}
              variant="success"
            />
          ) : (
            <AppButton variant="primary" loading={accepting} onClick={() => onAccept(opportunity)}>
              {opportunity.kind === "event" ? "Join event" : "Accept & help"}
            </AppButton>
          )}
        </div>
      </div>
    </InfoCard>
  );
}
