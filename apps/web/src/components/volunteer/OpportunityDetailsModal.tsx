import { CalendarDays, CheckCircle2, Clock, MapPin, Sparkles } from "lucide-react";

import type { Opportunity, Urgency } from "../../types/volunteer";
import { TASK_CATEGORY_LABEL, URGENCY_LABEL } from "../../types/volunteer";
import { formatDate, formatTimeRange } from "../../lib/format";
import { AppButton, Modal, Pill, StatusBadge } from "../ui";

export type OpportunityDetailsModalProps = {
  opportunity: Opportunity | null;
  // Worked out by the page from the start time and the current clock.
  urgency: Urgency;
  joined: boolean;
  // True while this opportunity's accept is being saved.
  accepting?: boolean;
  onClose: () => void;
  onAccept: (opportunity: Opportunity) => void;
};

// Opportunity-details dialog: the full request/event info plus an accept action.
// Mirrors the Community EventDetailsModal so both feeds use the same
// "View details -> act" flow.
export function OpportunityDetailsModal({
  opportunity,
  urgency,
  joined,
  accepting = false,
  onClose,
  onAccept,
}: OpportunityDetailsModalProps) {
  const urgencyVariant = urgency === "high" ? "danger" : urgency === "medium" ? "warning" : "info";
  // The match reasons repeat the distance already shown in the location line.
  const reasons = opportunity
    ? opportunity.reasons.filter((reason) => !/\bkm away\b/.test(reason))
    : [];

  return (
    <Modal
      open={opportunity !== null}
      title={opportunity?.title ?? "Opportunity details"}
      onClose={onClose}
      footer={
        opportunity && (
          <>
            <AppButton variant="ghost" onClick={onClose}>
              Close
            </AppButton>
            {joined ? (
              <AppButton variant="secondary" disabled>
                {opportunity.kind === "event" ? "You joined this" : "You accepted this"}
              </AppButton>
            ) : (
              <AppButton
                variant="primary"
                loading={accepting}
                onClick={() => onAccept(opportunity)}
              >
                {opportunity.kind === "event" ? "Join event" : "Accept & help"}
              </AppButton>
            )}
          </>
        )
      }
    >
      {opportunity && (
        <div className="ui-stack ui-gap-3">
          <div className="ui-chip-row ui-gap-2">
            <Pill>{TASK_CATEGORY_LABEL[opportunity.category]}</Pill>
            <StatusBadge label={URGENCY_LABEL[urgency]} variant={urgencyVariant} />
            <span className="match-score" title="How well this fits you">
              <Sparkles size={14} aria-hidden="true" />
              {opportunity.matchScore}% match
            </span>
          </div>

          <span className="inline-icon">
            <MapPin size={16} className="icon-dim" aria-hidden="true" />
            {opportunity.area} · {opportunity.distanceKm} km away
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

          <p className="ui-flush ui-multiline">{opportunity.summary}</p>

          {reasons.length > 0 && (
            <ul className="match-reasons" aria-label="Why this matches you">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}

          {joined && (
            <span className="ui-badge ui-badge--success" role="status">
              <CheckCircle2 size={14} aria-hidden="true" />
              {opportunity.kind === "event" ? "You joined this event" : "You accepted this request"}
            </span>
          )}
        </div>
      )}
    </Modal>
  );
}
