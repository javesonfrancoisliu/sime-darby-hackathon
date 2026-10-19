import { ArrowRight, Megaphone } from "lucide-react";

import { COMMUNITY_ITEMS } from "../../data/community.mock";
import { formatRelative } from "../../lib/format";
import { AppLinkButton, InfoCard, Pill } from "../ui";

const CATEGORY_LABEL: Record<string, string> = {
  event: "Event",
  maintenance: "Maintenance",
  volunteer: "Volunteer",
  township: "Township",
};

/**
 * Compact community summary for the shared Home page (the three latest items).
 * Exposed per the integration contract so Home composes it beside SafetyOverview
 * without duplicating the full community layout.
 */
export function CommunityOverview({ townshipId }: { townshipId?: string }) {
  const items = COMMUNITY_ITEMS.filter(
    (item) => !townshipId || item.townshipId === townshipId,
  ).slice(0, 3);

  return (
    <InfoCard ariaLabel="Latest community updates">
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">
            <span className="inline-icon">
              <Megaphone size={18} aria-hidden="true" />
              Latest community updates
            </span>
          </h3>
        </div>

        <ul className="ui-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li key={item.id} className="overview-item">
              <div className="inline-icon" style={{ gap: "var(--space-2)" }}>
                <Pill>{CATEGORY_LABEL[item.category]}</Pill>
                <span className="ui-meta-row">{formatRelative(item.updatedAt)}</span>
              </div>
              <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{item.title}</p>
            </li>
          ))}
        </ul>

        <div className="feature-card-foot">
          <AppLinkButton to="/community" variant="primary">
            Explore community
            <ArrowRight size={16} aria-hidden="true" />
          </AppLinkButton>
        </div>
      </div>
    </InfoCard>
  );
}
