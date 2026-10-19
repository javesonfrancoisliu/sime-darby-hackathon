import { CalendarClock, MapPin, Wrench } from "lucide-react";

import type { MaintenanceItem } from "../../types/community";
import { formatDateTime } from "../../lib/format";
import { maintenanceStatus } from "../../lib/status";
import { InfoCard, Pill, StatusBadge } from "../ui";
import { CardMeta } from "./CardMeta";

export type AnnouncementCardProps = {
  item: MaintenanceItem;
};

// Facility maintenance announcement: affected area, scheduled window, service
// impact and status (Scheduled / In Progress / Completed).
// NOTE: distinct from safety facility reports (Reported / In Progress / Resolved).
export function AnnouncementCard({ item }: AnnouncementCardProps) {
  const status = maintenanceStatus(item.status);
  return (
    <InfoCard as="li" ariaLabel={`Maintenance: ${item.title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">
            <span className="inline-icon">
              <Wrench size={18} className="icon-dim" aria-hidden="true" />
              {item.title}
            </span>
          </h3>
          <Pill>Maintenance</Pill>
        </div>

        <div className="ui-stack ui-gap-2">
          <span className="inline-icon">
            <MapPin size={16} className="icon-dim" aria-hidden="true" />
            {item.location}
          </span>
          <span className="inline-icon">
            <CalendarClock size={16} className="icon-dim" aria-hidden="true" />
            {formatDateTime(item.windowStart)} – {formatDateTime(item.windowEnd)}
          </span>
        </div>

        <p className="feature-card-desc">{item.serviceImpact}</p>

        <CardMeta updatedAt={item.updatedAt} source={item.source} />

        <div className="feature-card-foot">
          <StatusBadge label={status.label} variant={status.variant} />
        </div>
      </div>
    </InfoCard>
  );
}
