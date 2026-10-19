import { ArrowRight, HandHeart } from "lucide-react";

import { CommunityOverview } from "../components/community";
import { useRole } from "../components/layout";
import { SafetyOverview } from "../components/safety/SafetyOverview";
import { AppLinkButton, PageHeader } from "../components/ui";
import { DEMO_TOWNSHIP } from "../lib/township";

// Shared Home - the integrated General Dashboard. Prioritises the three primary
// dashboard functions: Health & Safety, Community updates, and (for the young
// role) a slim Help a Neighbour entry point.
//
// The My Impact summary (VolunteerOverview) was intentionally removed from Home
// to keep it compact; that component and its data are preserved for a future
// Profile → My Contributions page.
export function HomePage() {
  const { role } = useRole();
  const young = role === "young";

  return (
    <>
      <PageHeader
        title={`Welcome to ${DEMO_TOWNSHIP.name}`}
        subtitle={
          young
            ? "Your neighbourhood at a glance - find a quick way to help, stay safe and stay connected."
            : "Your neighbourhood at a glance - stay safe, stay connected and get involved."
        }
      />

      <section className="ui-section" aria-label="Township summary">
        <div className="home-cta-row">
          <SafetyOverview townshipId={DEMO_TOWNSHIP.id} townshipName={DEMO_TOWNSHIP.name} />
          <CommunityOverview townshipId={DEMO_TOWNSHIP.id} />
        </div>
      </section>

      {young && (
        <section className="ui-section" aria-label="Help a neighbour">
          <AppLinkButton to="/volunteer" variant="primary" className="home-help-cta">
            <HandHeart size={18} aria-hidden="true" />
            Help a neighbour nearby
            <ArrowRight size={16} aria-hidden="true" />
          </AppLinkButton>
        </section>
      )}
    </>
  );
}
