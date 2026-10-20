import { useState } from "react";

import { useSession } from "@sdh/api-client";

import { demoSignInEnabled } from "../../lib/demoFlag";
import { tokenModeEnabled } from "../../lib/authMode";
import {
  ClaimedRewardsCard,
  DemoSignInCard,
  EditPersonalModal,
  EditPreferencesModal,
  PreferencesCard,
  ProfileHeaderCard,
  SettingsCard,
} from "../../components/profile";
import { PageHeader, SignInPrompt } from "../../components/ui";
import { useRewards } from "../../data/useGamification";

// Young-resident Profile - account management, not an activity dashboard.
// Sections: Personal information, Volunteering preferences, My rewards (claimed),
// Settings. Volunteering tasks live in Volunteer Nearby; points/badges/
// leaderboard live in Community Challenges - not repeated here.
export function ProfilePage() {
  const { user } = useSession();
  const rewards = useRewards();
  const [editPersonal, setEditPersonal] = useState(false);
  const [editPrefs, setEditPrefs] = useState(false);

  const showLocalSignIn = demoSignInEnabled() && !tokenModeEnabled();

  if (!user) {
    return (
      <>
        <PageHeader title="Profile" subtitle="Your account, preferences and rewards." />
        {showLocalSignIn ? <DemoSignInCard /> : <SignInPrompt what="your profile" />}
      </>
    );
  }

  const claimed = (rewards.data?.rewards ?? [])
    .filter((reward) => reward.status === "redeemed")
    .sort((a, b) => (b.redeemedAt ?? "").localeCompare(a.redeemedAt ?? ""));

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account, preferences and rewards." />

      <section className="ui-section" aria-label="Personal information">
        <ProfileHeaderCard claimedCount={claimed.length} onEdit={() => setEditPersonal(true)} />
      </section>

      <section className="ui-section" aria-label="My rewards">
        <ClaimedRewardsCard
          claimed={claimed}
          loading={rewards.loading}
          error={rewards.error}
          onUsed={rewards.reload}
        />
      </section>

      <section className="ui-section" aria-label="Volunteering preferences">
        <PreferencesCard onEdit={() => setEditPrefs(true)} />
      </section>

      <section className="ui-section" aria-label="Settings">
        <SettingsCard />
      </section>

      {showLocalSignIn && <DemoSignInCard />}

      <EditPersonalModal
        key={editPersonal ? "personal-open" : "personal-closed"}
        open={editPersonal}
        onClose={() => setEditPersonal(false)}
      />
      <EditPreferencesModal
        key={editPrefs ? "prefs-open" : "prefs-closed"}
        open={editPrefs}
        onClose={() => setEditPrefs(false)}
      />
    </>
  );
}
