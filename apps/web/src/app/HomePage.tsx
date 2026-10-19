import { ArrowRight, HandHeart } from "lucide-react";

import { CommunityOverview } from "../components/community";
import { useRole } from "../components/layout";
import { SafetyOverview } from "../components/safety/SafetyOverview";
import { AppLinkButton, InfoCard, PageHeader } from "../components/ui";
import { useTownship } from "../data/useTownship";

// Shared Home - the integrated General Dashboard. Prioritises the three primary
// dashboard functions: Health & Safety, Community updates, and (for the young
// role) a prominent Help a Neighbour entry point above the summary row.
export function HomePage() {
  const { role } = useRole();
  const young = role === "young";
  const { township } = useTownship();

  return (
    <>
      <PageHeader
        title={township ? `Welcome to ${township.name}` : "Welcome"}
        subtitle={
          young
            ? "Your neighbourhood at a glance - find a quick way to help, stay safe and stay connected."
            : "Your neighbourhood at a glance - stay safe, stay connected and get involved."
        }
      />

      {young && (
        <section className="ui-section" aria-label="Help a neighbour">
          <InfoCard className="featured-card" ariaLabel="Help a neighbour nearby">
            <div className="feature-card">
              <div className="feature-card-head">
                <h2 className="feature-card-title">
                  <span className="inline-icon">
                    <HandHeart size={18} aria-hidden="true" />
                    Help a neighbour nearby
                  </span>
                </h2>
              </div>
              <p className="feature-card-desc">
                Lend a hand with groceries, rides or tech for a verified request near you.
              </p>
              <div className="feature-card-foot">
                <AppLinkButton to="/volunteer" variant="primary" className="home-help-cta">
                  Find ways to help
                  <ArrowRight size={16} aria-hidden="true" />
                </AppLinkButton>
              </div>
            </div>
          </InfoCard>
        </section>
      )}

      <section className="ui-section" aria-label="Township summary">
        <div className="home-cta-row">
          <SafetyOverview townshipName={township?.name} />
          <CommunityOverview />
        </div>
      </section>
    </>
  );
}
