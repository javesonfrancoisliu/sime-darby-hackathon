import { CalendarDays, Clock, MapPin, Sparkles } from "lucide-react";

import type { Opportunity, Urgency } from "../../types/volunteer";
import { TASK_CATEGORY_LABEL, URGENCY_LABEL } from "../../types/volunteer";
import { formatDate, formatTimeRange } from "../../lib/format";
import { AppButton, InfoCard, Pill, StatusBadge } from "../ui";

export type OpportunityCardProps = {
  opportunity: Opportunity;
  // Worked out by the page from the start time and the current clock.
  urgency: Urgency;
  joined: boolean;
  // Open the details popup for this opportunity. Accepting happens from there,
  // mirroring the Community page's "View details" -> act flow.
  onViewDetails: (opportunity: Opportunity) => void;
};

// One volunteering opportunity: category, urgency, distance, schedule and
// duration, plus a View details action. The summary, match reasons and accept
// action live in the details popup, matching the Community event cards.
export function OpportunityCard({
  opportunity,
  urgency,
  joined,
  onViewDetails,
}: OpportunityCardProps) {
  const distance = opportunity.distanceKm;
  const urgencyVariant = urgency === "high" ? "danger" : urgency === "medium" ? "warning" : "info";

  return (
    <InfoCard as="li" ariaLabel={`Opportunity: ${opportunity.title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">{opportunity.title}</h3>
          <Pill>{TASK_CATEGORY_LABEL[opportunity.category]}</Pill>
        </div>

        <div className="ui-chip-row ui-gap-2" aria-label="Highlights">
          <StatusBadge label={URGENCY_LABEL[urgency]} variant={urgencyVariant} />
          <span className="match-score" title="How well this fits you">
            <Sparkles size={14} aria-hidden="true" />
            {opportunity.matchScore}% match
          </span>
        </div>

        <div className="ui-stack ui-gap-2">
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

        <div className="feature-card-foot">
          {joined ? (
            <StatusBadge
              label={opportunity.kind === "event" ? "You joined this" : "You accepted this"}
              variant="success"
            />
          ) : (
            <AppButton variant="primary" onClick={() => onViewDetails(opportunity)}>
              View details
            </AppButton>
          )}
        </div>
      </div>
    </InfoCard>
  );
}
