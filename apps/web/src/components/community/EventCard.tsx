import { CalendarDays, MapPin, Users } from "lucide-react";

import type { EventItem } from "../../types/community";
import { formatDate, formatTimeRange } from "../../lib/format";
import { AppButton, InfoCard, Pill } from "../ui";
import { CardMeta } from "./CardMeta";

export type EventCardProps = {
  event: EventItem;
  onViewDetails: (event: EventItem) => void;
};

// Event card: title, date/time, location, short description, View details CTA.
export function EventCard({ event, onViewDetails }: EventCardProps) {
  return (
    <InfoCard as="li" ariaLabel={`Event: ${event.title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">{event.title}</h3>
          <Pill>Event</Pill>
        </div>

        <div className="ui-stack ui-gap-2">
          <span className="inline-icon">
            <CalendarDays size={16} className="icon-dim" aria-hidden="true" />
            {formatDate(event.startsAt)}, {formatTimeRange(event.startsAt, event.durationMinutes)}
          </span>
          <span className="inline-icon">
            <MapPin size={16} className="icon-dim" aria-hidden="true" />
            {event.location}
          </span>
          <span className="inline-icon">
            <Users size={16} className="icon-dim" aria-hidden="true" />
            {event.signupCount} of {event.capacity} joined
          </span>
        </div>

        <p className="feature-card-desc">{event.summary}</p>

        <CardMeta updatedAt={event.updatedAt} source={event.organiser} />

        <div className="feature-card-foot">
          <AppButton variant="primary" onClick={() => onViewDetails(event)}>
            View details
          </AppButton>
        </div>
      </div>
    </InfoCard>
  );
}
