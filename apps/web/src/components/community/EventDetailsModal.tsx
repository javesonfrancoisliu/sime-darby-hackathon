import { CalendarDays, CheckCircle2, MapPin, Users } from "lucide-react";

import type { EventItem } from "../../types/community";
import { formatDate, formatTimeRange } from "../../lib/format";
import { AppButton, Modal } from "../ui";

export type EventDetailsModalProps = {
  event: EventItem | null;
  registered: boolean;
  onClose: () => void;
  onRegister: (event: EventItem) => void;
};

// Stateful event-details dialog with venue, time and a register action.
export function EventDetailsModal({
  event,
  registered,
  onClose,
  onRegister,
}: EventDetailsModalProps) {
  return (
    <Modal
      open={event !== null}
      title={event?.title ?? "Event details"}
      onClose={onClose}
      footer={
        event && (
          <>
            <AppButton variant="ghost" onClick={onClose}>
              Close
            </AppButton>
            {registered ? (
              <AppButton variant="secondary" disabled>
                You&rsquo;re registered
              </AppButton>
            ) : (
              <AppButton variant="primary" onClick={() => onRegister(event)}>
                Register to attend
              </AppButton>
            )}
          </>
        )
      }
    >
      {event && (
        <>
          <span className="inline-icon">
            <CalendarDays size={16} className="icon-dim" aria-hidden="true" />
            {formatDate(event.startsAt)}, {formatTimeRange(event.startsAt, event.durationMinutes)}
          </span>
          <span className="inline-icon">
            <MapPin size={16} className="icon-dim" aria-hidden="true" />
            {event.location}
          </span>
          {event.organiser && (
            <span className="inline-icon">
              <Users size={16} className="icon-dim" aria-hidden="true" />
              Organised by {event.organiser}
            </span>
          )}
          <span className="inline-icon">
            <Users size={16} className="icon-dim" aria-hidden="true" />
            {event.signupCount} of {event.capacity} residents joined
          </span>
          <p className="ui-flush">{event.summary}</p>
          {registered && (
            <span className="ui-badge ui-badge--success" role="status">
              <CheckCircle2 size={14} aria-hidden="true" />
              You&rsquo;re registered for this event
            </span>
          )}
        </>
      )}
    </Modal>
  );
}
