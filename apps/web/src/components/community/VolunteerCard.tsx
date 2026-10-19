import { CalendarDays, CheckCircle2, HandHeart, MapPin, Users } from "lucide-react";

import type { VolunteerItem } from "../../types/community";
import { formatDate, formatTimeRange } from "../../lib/format";
import { AppButton, InfoCard, Pill } from "../ui";
import { CardMeta } from "./CardMeta";

export type VolunteerCardProps = {
  item: VolunteerItem;
  joined: boolean;
  onJoin: (item: VolunteerItem) => void;
};

// Volunteer opportunity: organisation/activity, date, location, slots (if known),
// and a stateful Join action with a visible confirmation.
export function VolunteerCard({ item, joined, onJoin }: VolunteerCardProps) {
  return (
    <InfoCard as="li" ariaLabel={`Volunteering: ${item.title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">
            <span className="inline-icon">
              <HandHeart size={18} className="icon-dim" aria-hidden="true" />
              {item.title}
            </span>
          </h3>
          <Pill>Volunteer</Pill>
        </div>

        <div className="ui-stack ui-gap-2">
          {item.organiser && <span>{item.organiser}</span>}
          <span className="inline-icon">
            <CalendarDays size={16} className="icon-dim" aria-hidden="true" />
            {formatDate(item.startsAt)}, {formatTimeRange(item.startsAt, item.durationMinutes)}
          </span>
          <span className="inline-icon">
            <MapPin size={16} className="icon-dim" aria-hidden="true" />
            {item.location}
          </span>
          <span className="inline-icon">
            <Users size={16} className="icon-dim" aria-hidden="true" />
            {item.slotsAvailable} {item.slotsAvailable === 1 ? "slot" : "slots"} left
          </span>
        </div>

        <p className="feature-card-desc">{item.summary}</p>

        <CardMeta updatedAt={item.updatedAt} />

        <div className="feature-card-foot">
          {joined ? (
            <span className="ui-badge ui-badge--success" role="status">
              <CheckCircle2 size={14} aria-hidden="true" />
              You&rsquo;re signed up
            </span>
          ) : (
            <AppButton
              variant="primary"
              disabled={item.slotsAvailable === 0}
              onClick={() => onJoin(item)}
            >
              {item.slotsAvailable === 0 ? "Full" : "Join"}
            </AppButton>
          )}
        </div>
      </div>
    </InfoCard>
  );
}
