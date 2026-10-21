import { useId, useState } from "react";
import { HelpCircle, Settings } from "lucide-react";

import { tokenModeEnabled } from "../../lib/authMode";
import { useProfile } from "../../data/ProfileContext";
import { useLargeText } from "../../data/LargeTextContext";
import { useSettings, type ProfileSettings } from "../../data/useSettings";
import { useTownship } from "../../data/useTownship";
import { errorMessage, useSession } from "@sdh/api-client";
import { useConfirm } from "../../lib/useConfirm";
import { AppButton, ConfirmActionDialog, Drawer } from "../ui";

type ToggleKey = keyof ProfileSettings;

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
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
        disabled={disabled}
        aria-describedby={descId}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

// Settings: notification and privacy choices saved to the account, plus help and sign out.
export function SettingsCard() {
  const { settings, loading, error, saveError, update, reload } = useSettings();
  const { leaderboardOptIn, setLeaderboardOptIn } = useProfile();
  const { township } = useTownship();
  const { signOut } = useSession();
  const { largeText, setLargeText } = useLargeText();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [optInError, setOptInError] = useState<string | null>(null);

  async function signOutOfAccount() {
    await signOut();
    window.location.assign("/");
  }

  function askSignOut() {
    confirm.ask({
      title: "Sign out?",
      message: "Are you sure you want to sign out?",
      confirmLabel: "Yes, sign out",
      confirmVariant: "danger",
      onConfirm: signOutOfAccount,
    });
  }

  async function changeLargeText(next: boolean) {
    setOptInError(null);
    try {
      await setLargeText(next);
      // Reload so the next toggle starts from the saved text size.
      await reload();
    } catch (err) {
      setOptInError(errorMessage(err));
    }
  }

  async function changeOptIn(next: boolean) {
    setOptInError(null);
    try {
      await setLeaderboardOptIn(next);
    } catch (err) {
      setOptInError(errorMessage(err));
    }
  }

  const ready = settings !== null;
  const toggles: { key: ToggleKey; label: string; description: string }[] = [
    {
      key: "notifyEvents",
      label: "Event reminders",
      description: "Tell me about community events.",
    },
    {
      key: "notifyVolunteering",
      label: "Volunteering updates",
      description: "Tell me about nearby requests.",
    },
    {
      key: "shareApproxLocation",
      label: "Share approximate area",
      description: "Use my area for distance sorting.",
    },
  ];

  return (
    <>
      <Drawer
        ariaLabel="Settings"
        label="Settings"
        open={open}
        onToggle={() => setOpen((current) => !current)}
        header={
          <h2 className="feature-card-title inline-icon">
            <Settings size={20} aria-hidden="true" /> Settings
          </h2>
        }
      >
        <div className="ui-stack ui-gap-2">
          {loading && <p className="ui-helper ui-flush-top">Loading your settings…</p>}
          {error && (
            <p className="ui-error ui-flush-top" role="alert">
              Couldn&rsquo;t load your settings. {error}
            </p>
          )}

          <h3 className="impact-subhead ui-flush-top">Appearance</h3>
          <ToggleRow
            label="Larger text"
            description="Increase text and control sizes across the app."
            checked={largeText}
            disabled={false}
            onChange={(next) => void changeLargeText(next)}
          />

          <h3 className="impact-subhead">Notifications</h3>
          {toggles.slice(0, 2).map((t) => (
            <ToggleRow
              key={t.key}
              label={t.label}
              description={t.description}
              checked={settings?.[t.key] ?? false}
              disabled={!ready}
              onChange={(next) => void update({ [t.key]: next })}
            />
          ))}

          <h3 className="impact-subhead">Privacy &amp; safety</h3>
          {toggles.slice(2).map((t) => (
            <ToggleRow
              key={t.key}
              label={t.label}
              description={t.description}
              checked={settings?.[t.key] ?? false}
              disabled={!ready}
              onChange={(next) => void update({ [t.key]: next })}
            />
          ))}
          <ToggleRow
            label="Show me on the leaderboard"
            description="Show my first name and last initial in rankings."
            checked={leaderboardOptIn}
            disabled={false}
            onChange={(next) => void changeOptIn(next)}
          />
          {(saveError ?? optInError) && (
            <p className="ui-error" role="alert" style={{ margin: "var(--space-2) 0 0" }}>
              {saveError ?? optInError}
            </p>
          )}

          {tokenModeEnabled() && (
            <>
              <h3 className="impact-subhead">Account</h3>
              <div className="settings-row">
                <a href="/account" className="ui-button ui-button--secondary">
                  Account settings
                </a>
                <AppButton variant="secondary" onClick={askSignOut}>
                  Sign out
                </AppButton>
              </div>
            </>
          )}

          <h3 className="impact-subhead">Help &amp; support</h3>
          <p className="ui-meta-row ui-flush">
            <span className="inline-icon">
              <HelpCircle size={16} className="icon-dim" aria-hidden="true" />
              {township ? (
                <>
                  Need help? Call the township security line on{" "}
                  <a className="tap-link" href={`tel:${township.securityLine.tel}`}>
                    {township.securityLine.display}
                  </a>
                  .
                </>
              ) : (
                "Need help? Contact your township office."
              )}
            </span>
          </p>
        </div>
      </Drawer>

      <ConfirmActionDialog
        open={confirm.open}
        title={confirm.request?.title ?? ""}
        message={confirm.request?.message ?? ""}
        confirmLabel={confirm.request?.confirmLabel}
        cancelLabel={confirm.request?.cancelLabel}
        confirmVariant={confirm.request?.confirmVariant}
        busy={confirm.busy}
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    </>
  );
}
