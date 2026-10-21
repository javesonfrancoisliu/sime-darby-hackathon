import { ArrowRight, Gift, HandHeart, Sparkles, Target, Trophy } from "lucide-react";

import { CommunityOverview } from "../components/community";
import { useRole } from "../components/layout";
import { SafetyOverview } from "../components/safety/SafetyOverview";
import { AppLinkButton, InfoCard, PageHeader } from "../components/ui";
import { useTownship } from "../data/useTownship";

// Tab values ChallengesPage reads from ?tab=.
const CHALLENGE_SHORTCUTS = [
  { label: "Rankings", tab: "leaderboard", icon: Trophy },
  { label: "Badges", tab: "badges", icon: Sparkles },
  { label: "Rewards", tab: "rewards", icon: Gift },
];

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

      {young && (
        <section className="ui-section" aria-label="Community Challenges">
          <InfoCard ariaLabel="Community Challenges card">
            <div className="feature-card">
              <div className="feature-card-head">
                <h2 className="feature-card-title">
                  <span className="inline-icon">
                    <Target size={18} aria-hidden="true" />
                    Community Challenges
                  </span>
                </h2>
              </div>
              <p className="feature-card-desc">
                Earn points for fitness, clean-ups and eco actions, then climb Rankings and claim
                rewards.
              </p>
              <div className="feature-card-foot">
                <AppLinkButton
                  to="/community/challenges"
                  variant="primary"
                  className="home-help-cta"
                >
                  Open challenges
                  <ArrowRight size={16} aria-hidden="true" />
                </AppLinkButton>
              </div>
              <div className="home-challenge-links">
                {CHALLENGE_SHORTCUTS.map(({ label, tab, icon: Icon }) => (
                  <AppLinkButton
                    key={tab}
                    to={`/community/challenges?tab=${tab}`}
                    variant="secondary"
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </AppLinkButton>
                ))}
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
