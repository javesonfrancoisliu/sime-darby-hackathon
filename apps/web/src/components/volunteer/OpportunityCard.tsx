import { CalendarDays, Clock, Info, MapPin, Sparkles } from "lucide-react";
import { useId, useState } from "react";

import type { Opportunity, Urgency } from "../../types/volunteer";
import { TASK_CATEGORY_LABEL } from "../../types/volunteer";
import { formatDate, formatTimeRange } from "../../lib/format";
import { AppButton, Drawer, StatusBadge } from "../ui";

export type OpportunityCardProps = {
  opportunity: Opportunity;
  urgency: Urgency;
  joined: boolean;
  accepting?: boolean;
  onAccept: (opportunity: Opportunity) => void;
};

export function OpportunityCard({
  opportunity,
  urgency,
  joined,
  accepting,
  onAccept,
}: OpportunityCardProps) {
  const [open, setOpen] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const reasonsId = useId();
  const urgent = opportunity.kind === "request" && urgency === "high";
  return (
    <li
      className={`community-event opportunity-card${urgent ? " opportunity-card--urgent" : ""}`}
      aria-label={`Opportunity: ${opportunity.title}${urgent ? ". Urgent" : ""}`}
    >
      <Drawer
        label={opportunity.title}
        open={open}
        onToggle={() => setOpen((current) => !current)}
        header={
          <div className="community-event__info">
            <div className="community-event__title">
              <h3 className="feature-card-title">{opportunity.title}</h3>
              <span className="community-event__type">
                {TASK_CATEGORY_LABEL[opportunity.category]}
              </span>
            </div>
            <span className="inline-icon">
              <MapPin size={16} aria-hidden="true" />
              {opportunity.area} / {opportunity.distanceKm} km away
            </span>
            <span className="inline-icon">
              <CalendarDays size={16} aria-hidden="true" />
              {formatDate(opportunity.scheduledAt)},{" "}
              {formatTimeRange(opportunity.scheduledAt, opportunity.durationMinutes)}
            </span>
          </div>
        }
      >
        <div className="ui-stack ui-gap-2">
          <p className="feature-card-desc">{opportunity.summary}</p>
          <span className="inline-icon">
            <Clock size={16} aria-hidden="true" />
            {opportunity.durationMinutes} min
          </span>
        </div>
      </Drawer>
      <div className="opportunity-card__matching">
        <button
          type="button"
          className="match-score opportunity-card__match-toggle"
          aria-label={`${opportunity.matchScore}% match. Why this matches you`}
          aria-expanded={showReasons}
          aria-controls={reasonsId}
          title="Click to see why this matches you"
          onClick={() => setShowReasons((current) => !current)}
        >
          <Sparkles size={14} aria-hidden="true" />
          {opportunity.matchScore}% match
          <Info size={15} aria-hidden="true" />
        </button>
        {showReasons && (
          <div
            id={reasonsId}
            className="opportunity-card__reasons"
            role="region"
            aria-label="Why this matches you"
          >
            <strong>Why this matches you</strong>
            {opportunity.reasons.length > 0 ? (
              <ul className="match-reasons">
                {opportunity.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="ui-flush">
                Matching reasons aren't available for this opportunity yet.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="community-event__footer">
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
    </li>
  );
}
