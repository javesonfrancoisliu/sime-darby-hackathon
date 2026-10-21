import { useId, useState, type RefObject } from "react";

import { errorMessage } from "@sdh/api-client";

import { useLargeText } from "../../data/LargeTextContext";
import { useProfile } from "../../data/ProfileContext";
import { useSettings, type ProfileSettings } from "../../data/useSettings";
import { AppButton, Sheet } from "../ui";

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

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  { key: "notifyEvents", label: "Event reminders", description: "Tell me about community events." },
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

export type SettingsSheetProps = {
  onClose: () => void;
  openerRef: RefObject<HTMLElement | null>;
  onSaved: () => void;
};

// Settings: appearance, notification and privacy choices saved to the account.
export function SettingsSheet({ onClose, openerRef, onSaved }: SettingsSheetProps) {
  const { settings, loading, error, update, reload } = useSettings();
  const { leaderboardOptIn, setLeaderboardOptIn } = useProfile();
  const { largeText, setLargeText } = useLargeText();
  const [failure, setFailure] = useState<{ message: string; retry: () => void } | null>(null);

  // Runs one save, says "Saved" on success and offers a retry on failure.
  async function save(action: () => Promise<void>) {
    setFailure(null);
    try {
      await action();
      onSaved();
    } catch (err) {
      setFailure({ message: errorMessage(err), retry: () => void save(action) });
    }
  }

  const changeLargeText = (next: boolean) =>
    save(async () => {
      await setLargeText(next);
      // Reload so the next toggle starts from the saved text size.
      await reload();
    });

  const ready = settings !== null;
  const toggle = (key: ToggleKey) => {
    const item = TOGGLES.find((t) => t.key === key);
    if (!item) return null;
    return (
      <ToggleRow
        key={key}
        label={item.label}
        description={item.description}
        checked={settings?.[key] ?? false}
        disabled={!ready}
        onChange={(next) => void save(() => update({ [key]: next }))}
      />
    );
  };

  return (
    <Sheet open onClose={onClose} openerRef={openerRef} title="Settings">
      <div className="ui-stack ui-gap-2">
        {loading && <p className="ui-helper ui-flush-top">Loading your settings…</p>}
        {error && (
          <p className="ui-error ui-flush-top" role="alert">
            Couldn&rsquo;t load your settings. {error}
          </p>
        )}

        <ToggleRow
          label="Larger text"
          description="Increase text and control sizes across the app."
          checked={largeText}
          disabled={false}
          onChange={(next) => void changeLargeText(next)}
        />
        {toggle("notifyEvents")}
        {toggle("notifyVolunteering")}
        <ToggleRow
          label="Show me in Rankings"
          description="Show my first name and last initial in rankings."
          checked={leaderboardOptIn}
          disabled={false}
          onChange={(next) => void save(() => setLeaderboardOptIn(next))}
        />
        {toggle("shareApproxLocation")}

        {failure && (
          <div className="ui-stack ui-gap-2">
            <p className="ui-error" role="alert" style={{ margin: "var(--space-2) 0 0" }}>
              Couldn&rsquo;t save that change. {failure.message}
            </p>
            <AppButton variant="secondary" onClick={failure.retry}>
              Try again
            </AppButton>
          </div>
        )}
      </div>
    </Sheet>
  );
}
