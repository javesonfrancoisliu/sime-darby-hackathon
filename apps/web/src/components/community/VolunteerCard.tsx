import { CalendarDays, CheckCircle2, HandHeart, MapPin, Users } from "lucide-react";

import type { VolunteerItem } from "../../types/community";
import { formatDate } from "../../lib/format";
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

        <div className="ui-stack" style={{ gap: "var(--space-2)" }}>
          <span>{item.organisation}</span>
          <span className="inline-icon">
            <CalendarDays size={16} className="icon-dim" aria-hidden="true" />
            {formatDate(item.startsAt)}
          </span>
          <span className="inline-icon">
            <MapPin size={16} className="icon-dim" aria-hidden="true" />
            {item.location}
          </span>
          {typeof item.slotsAvailable === "number" && (
            <span className="inline-icon">
              <Users size={16} className="icon-dim" aria-hidden="true" />
              {item.slotsAvailable} slots available
            </span>
          )}
        </div>

        <p className="feature-card-desc">{item.summary}</p>

        <CardMeta
          updatedAt={item.updatedAt}
          sourceLabel={item.sourceLabel}
          isDemoData={item.isDemoData}
        />

        <div className="feature-card-foot">
          {joined ? (
            <span className="ui-badge ui-badge--success" role="status">
              <CheckCircle2 size={14} aria-hidden="true" />
              You&rsquo;re signed up
            </span>
          ) : (
            <AppButton variant="primary" onClick={() => onJoin(item)}>
              Join
            </AppButton>
          )}
        </div>
      </div>
    </InfoCard>
  );
}
