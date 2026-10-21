import { ArrowRight, CloudOff, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";

import { useCommunityItems } from "../../data/useCommunityItems";
import { COMMUNITY_TAB_LABEL, communityTabPath } from "../../lib/community";
import { formatRelative } from "../../lib/format";
import { AppLinkButton, EmptyState, InfoCard, LoadingState, Pill } from "../ui";

const LATEST_COUNT = 3;

// Compact community summary for Home: the latest notices, volunteer drives and events.
export function CommunityOverview() {
  const { items, loading, error } = useCommunityItems();
  const latest = items.slice(0, LATEST_COUNT);

  return (
    <InfoCard ariaLabel="Latest community updates">
      <div className="feature-card">
        <div className="feature-card-head">
          <h2 className="feature-card-title">
            <span className="inline-icon">
              <Megaphone size={18} aria-hidden="true" />
              Latest community updates
            </span>
          </h2>
        </div>

        {loading ? (
          <LoadingState rows={2} label="Loading community updates" />
        ) : error && latest.length === 0 ? (
          <EmptyState icon={CloudOff} title="Couldn't load community updates" description={error} />
        ) : latest.length === 0 ? (
          <EmptyState title="Nothing new yet" description="Updates and events will show up here." />
        ) : (
          <ul className="ui-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {latest.map((item) => (
              <li key={item.id} className="overview-item">
                <Link to={communityTabPath(item.category)} className="overview-link">
                  <div className="inline-icon ui-gap-2">
                    <Pill>{COMMUNITY_TAB_LABEL[item.category]}</Pill>
                    <span className="ui-meta-row">{formatRelative(item.publishedAt)}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{item.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

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
