import { Bell, CalendarDays } from "lucide-react";
import { useState } from "react";

import type { TownshipUpdateItem } from "../../types/community";
import { formatDate } from "../../lib/format";
import { Drawer, StatusBadge } from "../ui";
import { CardMeta } from "./CardMeta";

export type TownshipUpdateCardProps = {
  item: TownshipUpdateItem;
};

export function TownshipUpdateCard({ item }: TownshipUpdateCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <li className="community-event" aria-label={`Township update: ${item.title}`}>
      <Drawer
        label={item.title}
        open={open}
        onToggle={() => setOpen((current) => !current)}
        header={
          <div className="community-event__summary">
            <Bell size={22} aria-hidden="true" />
            <div className="community-event__info">
              <div className="community-event__title">
                <h3 className="feature-card-title">{item.title}</h3>
                {item.priority === "high" && (
                  <StatusBadge label="High priority" variant="warning" />
                )}
              </div>
              <span className="ui-meta-row">{item.topic}</span>
              <span className="inline-icon">
                <CalendarDays size={16} aria-hidden="true" />
                {formatDate(item.publishedAt)}
              </span>
            </div>
          </div>
        }
      >
        <div className="ui-stack ui-gap-2">
          <p className="feature-card-desc">{item.summary}</p>
          <CardMeta updatedAt={item.updatedAt} source={item.source} />
        </div>
      </Drawer>
    </li>
  );
}
