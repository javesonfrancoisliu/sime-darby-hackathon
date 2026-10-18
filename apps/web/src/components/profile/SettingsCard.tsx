import { useId } from "react";
import { HelpCircle } from "lucide-react";

import { useSession } from "@sdh/api-client";

import { tokenModeEnabled } from "../../lib/authMode";
import { useProfile, type ProfileSettings } from "../../data/ProfileContext";
import { AppButton, InfoCard } from "../ui";

type ToggleKey = keyof ProfileSettings;

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  const descId = `${id}-desc`;
  return (
    <div className="settings-row">
      <label className="settings-row-text" htmlFor={id}>
        <span className="settings-row-label">{label}</span>
        <span className="ui-meta-row" id={descId}>
          {description}
        </span>
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="settings-switch"
        checked={checked}
        aria-describedby={descId}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

// Settings: mock notification + privacy toggles, help & support. Honest demo
// labelling - these do NOT control real push notifications or enforce backend
// privacy. Demo Controls are rendered by the page below this card.
export function SettingsCard() {
  const { settings, updateSettings } = useProfile();
  const { signOut } = useSession();

  async function signOutOfAccount() {
    await signOut();
    window.location.assign("/");
  }

  const toggles: { key: ToggleKey; label: string; description: string }[] = [
    {
      key: "notifyEvents",
      label: "Event reminders",
      description: "Notify me about community events (demo).",
    },
    {
      key: "notifyVolunteering",
      label: "Volunteering updates",
      description: "Notify me about nearby requests (demo).",
    },
    {
      key: "shareApproxLocation",
      label: "Share approximate area",
      description: "Use my area for distance sorting (demo).",
    },
    {
      key: "showOnLeaderboard",
      label: "Show me on the leaderboard",
      description: "Display my name in rankings (demo).",
    },
  ];

  return (
    <InfoCard ariaLabel="Settings">
      <div className="feature-card">
        <div className="feature-card-head">
          <h2 className="feature-card-title">Settings</h2>
        </div>

        <h3 className="impact-subhead ui-flush-top">Notifications</h3>
        {toggles.slice(0, 2).map((t) => (
          <ToggleRow
            key={t.key}
            label={t.label}
            description={t.description}
            checked={settings[t.key]}
            onChange={(next) => updateSettings({ [t.key]: next })}
          />
        ))}

        <h3 className="impact-subhead">Privacy &amp; safety</h3>
        {toggles.slice(2).map((t) => (
          <ToggleRow
            key={t.key}
            label={t.label}
            description={t.description}
            checked={settings[t.key]}
            onChange={(next) => updateSettings({ [t.key]: next })}
          />
        ))}
        <p className="ui-helper" style={{ margin: "var(--space-2) 0 0" }}>
          Demo only: these toggles are saved on this device and do not send real notifications or
          change who can see your information.
        </p>

        {tokenModeEnabled() && (
          <>
            <h3 className="impact-subhead">Account</h3>
            <div className="settings-row">
              <a href="/account" className="ui-button ui-button--secondary">
                Account settings
              </a>
              <AppButton variant="secondary" onClick={signOutOfAccount}>
                Sign out
              </AppButton>
            </div>
          </>
        )}

        <h3 className="impact-subhead">Help &amp; support</h3>
        <p className="ui-meta-row ui-flush">
          <span className="inline-icon">
            <HelpCircle size={16} className="icon-dim" aria-hidden="true" />
            Help a Neighbour is a hackathon prototype. For demo questions, ask the team.
          </span>
        </p>
      </div>
    </InfoCard>
  );
}
