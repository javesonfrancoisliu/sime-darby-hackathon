import { CalendarClock, MapPin, Wrench } from "lucide-react";
import { useState } from "react";

import type { MaintenanceItem } from "../../types/community";
import { formatDateTimeRange } from "../../lib/format";
import { maintenanceStatus } from "../../lib/status";
import { Drawer, StatusBadge } from "../ui";
import { CardMeta } from "./CardMeta";

export type AnnouncementCardProps = {
  item: MaintenanceItem;
};

export function AnnouncementCard({ item }: AnnouncementCardProps) {
  const status = maintenanceStatus(item.status);
  const [open, setOpen] = useState(false);
  return (
    <li className="community-event" aria-label={`Maintenance: ${item.title}`}>
      <Drawer
        open={open}
        onToggle={() => setOpen((current) => !current)}
        header={
          <div className="community-event__summary">
            <Wrench size={22} aria-hidden="true" />
            <div className="community-event__info">
              <div className="community-event__title">
                <h3 className="feature-card-title">{item.title}</h3>
                <StatusBadge label={status.label} variant={status.variant} />
              </div>
              <span className="inline-icon">
                <MapPin size={16} aria-hidden="true" />
                {item.location}
              </span>
              <span className="inline-icon">
                <CalendarClock size={16} aria-hidden="true" />
                {formatDateTimeRange(item.windowStart, item.windowEnd)}
              </span>
            </div>
          </div>
        }
      >
        <div className="ui-stack ui-gap-2">
          <p className="feature-card-desc">{item.summary}</p>
          {item.serviceImpact !== item.summary && (
            <p className="feature-card-desc">{item.serviceImpact}</p>
          )}
          <CardMeta updatedAt={item.updatedAt} source={item.source} />
        </div>
      </Drawer>
    </li>
  );
}
