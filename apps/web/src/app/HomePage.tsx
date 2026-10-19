import { ArrowRight, HandHeart } from "lucide-react";

import { CommunityOverview } from "../components/community";
import { useRole } from "../components/layout";
import { SafetyOverview } from "../components/safety/SafetyOverview";
import { AppLinkButton, PageHeader } from "../components/ui";
import { useTownship } from "../data/useTownship";

// Shared Home - the integrated General Dashboard. Prioritises the three primary
// dashboard functions: Health & Safety, Community updates, and (for the young
// role) a slim Help a Neighbour entry point.
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

      <section className="ui-section" aria-label="Township summary">
        <div className="home-cta-row">
          <SafetyOverview townshipName={township?.name} />
          <CommunityOverview />
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
