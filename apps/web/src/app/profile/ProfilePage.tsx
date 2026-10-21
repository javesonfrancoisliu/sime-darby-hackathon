import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Gift, IdCard, LifeBuoy, Settings, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useSession } from "@sdh/api-client";

import {
  AccountSheet,
  DemoSignInCard,
  EditPersonalSheet,
  EditPreferencesModal,
  HelpSafetySheet,
  MyDetailsSheet,
  MyRewardsSheet,
  ProfileHeaderCard,
  SettingsSheet,
} from "../../components/profile";
import { HubRow, PageHeader, SignInPrompt, useToast } from "../../components/ui";
import { useLargeText } from "../../data/LargeTextContext";
import { useProfile } from "../../data/ProfileContext";
import { usePoints, useRewards } from "../../data/useGamification";
import { tokenModeEnabled } from "../../lib/authMode";
import { demoSignInEnabled } from "../../lib/demoFlag";
import { preferencesSummary } from "../../lib/profileSummary";

type ProfileSheet = "rewards" | "details" | "settings" | "help" | "account";

// The old /profile/details address redirects here asking for the My details drawer.
function initialSheet(state: unknown): ProfileSheet | null {
  const wanted = (state as { openSheet?: unknown } | null)?.openSheet;
  return wanted === "details" ? "details" : null;
}

const onOff = (value: boolean) => (value ? "on" : "off");

// Young-resident Profile hub: who is signed in, then one row each for rewards, details, settings,
// help and the account. Volunteering tasks live in Volunteer Nearby; points, badges and Rankings
// live in Community Challenges.
export function ProfilePage() {
  const { user } = useSession();
  const { prefs, leaderboardOptIn } = useProfile();
  const { largeText } = useLargeText();
  const points = usePoints();
  const rewards = useRewards();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<ProfileSheet | null>(() => initialSheet(location.state));
  const [editPersonal, setEditPersonal] = useState(false);
  const [editPrefs, setEditPrefs] = useState(false);
  // True while the preferences editor was opened from My details, which comes back when it closes.
  const fromDetails = useRef(false);
  // The row that opened a sheet, stored on its click so focus can return to it on close.
  const opener = useRef<HTMLElement | null>(null);
  const detailsRow = useRef<HTMLButtonElement>(null);
  const { notify, toast } = useToast();
  const saved = () => notify("Saved");

  // The redirect state only opens My details once: clear it so a reload or a later Back does not.
  // This runs in the layout phase, before the sheet's own effect pushes its history entry, so the
  // replace lands on the Profile entry and never overwrites the sheet's marker. Signed out, the
  // request is kept: the sheet state is already set and opens once the person is in.
  const signedIn = user !== null;
  useLayoutEffect(() => {
    if (!signedIn || !initialSheet(location.state)) return;
    // No click opened it, so focus goes back to the My details row when it closes.
    opener.current ??= detailsRow.current;
    // Already mounted at /profile when the redirect arrives: the initial state above never ran.
    setSheet((current) => current ?? "details");
    navigate({ pathname: location.pathname, search: location.search }, { replace: true });
  }, [signedIn, location.state, location.pathname, location.search, navigate]);

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
  const toUse = claimed.filter((reward) => !reward.usedAt).length;

  const rewardsSummary =
    points.data === null || rewards.data === null
      ? "Points and vouchers"
      : `${points.data.points} ${points.data.points === 1 ? "point" : "points"} · ${toUse} ${
          toUse === 1 ? "voucher" : "vouchers"
        } to use`;

  function show(next: ProfileSheet, event: MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    setSheet(next);
  }
  const closeSheet = () => setSheet(null);
  function closePrefs() {
    setEditPrefs(false);
    if (fromDetails.current) setSheet("details");
    fromDetails.current = false;
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account, preferences and rewards." />

      <section className="ui-section" aria-label="Personal information">
        <ProfileHeaderCard
          claimedCount={claimed.length}
          onEdit={(event) => {
            opener.current = event.currentTarget;
            setEditPersonal(true);
          }}
        />
      </section>

      <section className="ui-section" aria-label="Profile menu">
        <div className="ui-hub-group">
          <HubRow
            icon={<Gift size={22} />}
            title="My rewards"
            summary={rewardsSummary}
            onClick={(event) => show("rewards", event)}
          />
          <HubRow
            icon={<IdCard size={22} />}
            title="My details"
            buttonRef={detailsRow}
            summary={preferencesSummary(prefs)}
            onClick={(event) => show("details", event)}
          />
          <HubRow
            icon={<Settings size={22} />}
            title="Settings"
            summary={`Larger text ${onOff(largeText)} · Rankings ${onOff(leaderboardOptIn)}`}
            onClick={(event) => show("settings", event)}
          />
          <HubRow
            icon={<LifeBuoy size={22} />}
            title="Help and safety"
            summary="Township security and 999"
            onClick={(event) => show("help", event)}
          />
          <HubRow
            icon={<UserRound size={22} />}
            title="Account"
            summary={
              tokenModeEnabled() ? "Account settings and sign out" : `Signed in as ${user.name}`
            }
            onClick={(event) => show("account", event)}
          />
        </div>
      </section>

      {sheet === "rewards" && (
        <MyRewardsSheet
          onClose={closeSheet}
          openerRef={opener}
          points={points.data?.points}
          claimed={claimed}
          loading={rewards.loading}
          error={rewards.error}
          onUsed={rewards.reload}
        />
      )}
      {sheet === "details" && (
        <MyDetailsSheet
          onClose={closeSheet}
          openerRef={opener}
          onEditPreferences={() => {
            // One dialog at a time: the drawer goes, then the editor opens in its place.
            fromDetails.current = true;
            setSheet(null);
            setEditPrefs(true);
          }}
        />
      )}
      {sheet === "settings" && (
        <SettingsSheet onClose={closeSheet} openerRef={opener} onSaved={saved} />
      )}
      {sheet === "help" && <HelpSafetySheet onClose={closeSheet} openerRef={opener} />}
      {sheet === "account" && <AccountSheet onClose={closeSheet} openerRef={opener} />}

      {editPersonal && (
        <EditPersonalSheet
          onClose={() => setEditPersonal(false)}
          openerRef={opener}
          onSaved={saved}
        />
      )}
      <EditPreferencesModal
        key={editPrefs ? "prefs-open" : "prefs-closed"}
        open={editPrefs}
        onClose={closePrefs}
        onSaved={saved}
      />
      {toast}
    </>
  );
}
