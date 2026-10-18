import { Megaphone } from "lucide-react";

import type { TownshipUpdateItem } from "../../types/community";
import { formatDate } from "../../lib/format";
import { AppButton, InfoCard, Pill, StatusBadge } from "../ui";
import { CardMeta } from "./CardMeta";

export type TownshipUpdateCardProps = {
  item: TownshipUpdateItem;
  onReadMore: (item: TownshipUpdateItem) => void;
};

// Township update: official news, published date, topic, Read more CTA.
export function TownshipUpdateCard({ item, onReadMore }: TownshipUpdateCardProps) {
  return (
    <InfoCard as="li" ariaLabel={`Township update: ${item.title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">
            <span className="inline-icon">
              <Megaphone size={18} className="icon-dim" aria-hidden="true" />
              {item.title}
            </span>
          </h3>
          <div className="inline-icon" style={{ gap: "var(--space-2)" }}>
            {item.priority === "high" && (
              <StatusBadge label="High priority" variant="warning" />
            )}
            <Pill>{item.topic}</Pill>
          </div>
        </div>

        <span className="ui-meta-row">Published {formatDate(item.publishedAt)}</span>

        <p className="feature-card-desc">{item.summary}</p>

        <CardMeta
          updatedAt={item.updatedAt}
          sourceLabel={item.sourceLabel}
          isDemoData={item.isDemoData}
        />

        <div className="feature-card-foot">
          <AppButton variant="secondary" onClick={() => onReadMore(item)}>
            Read more
          </AppButton>
        </div>
      </div>
    </InfoCard>
  );
}
