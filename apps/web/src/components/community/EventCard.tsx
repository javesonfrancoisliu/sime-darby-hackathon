import { CalendarDays, Clock, MapPin } from "lucide-react";
import { useState } from "react";

import type { EventItem } from "../../types/community";
import { formatWhen } from "../../lib/format";
import { AppButton, Drawer } from "../ui";
import { CardMeta } from "./CardMeta";

const EVENT_TYPE_LABEL = {
  community_activity: "Community",
  health_literacy: "Health",
  digital_literacy: "Learning",
};

export type EventCardProps = {
  event: EventItem;
  onRegister: (event: EventItem) => void;
};

export function EventCard({ event, onRegister }: EventCardProps) {
  const [open, setOpen] = useState(false);
  const slots = Math.max(0, event.capacity - event.signupCount);
  return (
    <li className="community-event" aria-label={`Event: ${event.title}`}>
      <Drawer
        label={event.title}
        open={open}
        onToggle={() => setOpen((current) => !current)}
        header={
          <div className="community-event__summary">
            <CalendarDays size={22} aria-hidden="true" />
            <div className="community-event__info">
              <div className="community-event__title">
                <h3 className="feature-card-title">{event.title}</h3>
                <span className="community-event__type">{EVENT_TYPE_LABEL[event.eventType]}</span>
              </div>
              <span className="inline-icon">
                <Clock size={14} aria-hidden="true" />
                {formatWhen(event.startsAt)}
              </span>
              <span className="inline-icon">
                <MapPin size={14} aria-hidden="true" />
                {event.location}
              </span>
            </div>
          </div>
        }
      >
        <div className="ui-stack ui-gap-2">
          <p className="feature-card-desc">{event.summary}</p>
          <CardMeta updatedAt={event.updatedAt} source={event.organiser} />
        </div>
      </Drawer>
      <div className="community-event__footer">
        <span>
          {event.joined ? (
            "You're registered"
          ) : slots === 0 ? (
            "Fully booked"
          ) : (
            <>
              Only <strong>{slots}</strong> {slots === 1 ? "spot" : "spots"} left
            </>
          )}
        </span>
        <AppButton
          variant="primary"
          disabled={event.joined || slots === 0}
          onClick={() => onRegister(event)}
        >
          {event.joined ? "Registered" : "Register"}
        </AppButton>
      </div>
    </li>
  );
}
