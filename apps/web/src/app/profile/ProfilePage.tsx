import { useState } from "react";

import { DemoControls } from "../../components/demo/DemoControls";
import {
  ClaimedRewardsCard,
  EditPersonalModal,
  EditPreferencesModal,
  PreferencesCard,
  ProfileHeaderCard,
  SettingsCard,
} from "../../components/profile";
import { PageHeader } from "../../components/ui";
import { useGamification } from "../../data/useGamification";

/**
 * Young-resident Profile — account management, not an activity dashboard.
 * Sections: Personal information, Volunteering preferences, My rewards (claimed),
 * Settings. Volunteering tasks live in Volunteer Nearby; points/badges/
 * leaderboard live in Community Challenges — not repeated here.
 */
export function ProfilePage() {
  const { claimedRewards } = useGamification();
  const [editPersonal, setEditPersonal] = useState(false);
  const [editPrefs, setEditPrefs] = useState(false);

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account, preferences and rewards." />

      <section className="ui-section" aria-label="Personal information">
        <ProfileHeaderCard
          claimedCount={claimedRewards.length}
          onEdit={() => setEditPersonal(true)}
        />
      </section>

      <section className="ui-section" aria-label="Volunteering preferences">
        <PreferencesCard onEdit={() => setEditPrefs(true)} />
      </section>

      <section className="ui-section" aria-label="My rewards">
        <ClaimedRewardsCard claimed={claimedRewards} />
      </section>

      <section className="ui-section" aria-label="Settings">
        <SettingsCard />
      </section>

      {/* Demo-only reset (hidden unless demo controls are enabled). */}
      <DemoControls />

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
