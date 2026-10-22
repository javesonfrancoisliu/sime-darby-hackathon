import { CalendarDays, CheckCircle2, HandHeart, MapPin } from "lucide-react";
import { useState } from "react";

import type { VolunteerItem } from "../../types/community";
import { formatDate, formatTimeRange } from "../../lib/format";
import { AppButton, Drawer } from "../ui";
import { CardMeta } from "./CardMeta";

export type VolunteerCardProps = {
  item: VolunteerItem;
  joined: boolean;
  onJoin: (item: VolunteerItem) => void;
};

export function VolunteerCard({ item, joined, onJoin }: VolunteerCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <li className="community-event" aria-label={`Volunteering: ${item.title}`}>
      <Drawer
        open={open}
        onToggle={() => setOpen((current) => !current)}
        header={
          <div className="community-event__summary">
            <HandHeart size={22} aria-hidden="true" />
            <div className="community-event__info">
              <h3 className="feature-card-title">{item.title}</h3>
              {item.organiser && <span>{item.organiser}</span>}
              <span className="inline-icon">
                <CalendarDays size={16} aria-hidden="true" />
                {formatDate(item.startsAt)}, {formatTimeRange(item.startsAt, item.durationMinutes)}
              </span>
              <span className="inline-icon">
                <MapPin size={16} aria-hidden="true" />
                {item.location}
              </span>
            </div>
          </div>
        }
      >
        <div className="ui-stack ui-gap-2">
          <p className="feature-card-desc">{item.summary}</p>
          <CardMeta updatedAt={item.updatedAt} />
        </div>
      </Drawer>
      <div className="community-event__footer">
        <span>
          {item.slotsAvailable} {item.slotsAvailable === 1 ? "slot" : "slots"} left
        </span>
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
    </li>
  );
}
