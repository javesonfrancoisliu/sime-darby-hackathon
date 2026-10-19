import { ArrowRight, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AppButton, InfoCard } from "../ui";

// Compact entry point to Community Challenges, shown near the top of the
// Community page for the young role. Kept small so it does not push announcements
// and events down the page.
export function ChallengesEntryCard() {
  const navigate = useNavigate();
  return (
    <InfoCard className="challenges-entry" ariaLabel="Community Challenges">
      <span className="challenges-entry-icon" aria-hidden="true">
        <Trophy size={22} />
      </span>
      <div className="challenges-entry-body">
        <strong>Community Challenges</strong>
        <p>Earn points for fitness, clean-ups and eco actions.</p>
      </div>
      <AppButton variant="secondary" onClick={() => navigate("/community/challenges")}>
        Open
        <ArrowRight size={16} aria-hidden="true" />
      </AppButton>
    </InfoCard>
  );
}
