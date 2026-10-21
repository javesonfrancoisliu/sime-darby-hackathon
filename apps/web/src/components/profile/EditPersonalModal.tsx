import { useState } from "react";

import { errorMessage } from "@sdh/api-client";
import { MAX_NAME_LENGTH, Precinct } from "@sdh/contracts";

import { useProfile } from "../../data/ProfileContext";
import { AppButton, FormField, Modal } from "../ui";
import { Avatar } from "./Avatar";

export type EditPersonalModalProps = {
  open: boolean;
  onClose: () => void;
  // Called after the details are saved.
  onSaved?: () => void;
};

// Edit display name and precinct. The avatar is initials-based and previews live.
export function EditPersonalModal({ open, onClose, onSaved }: EditPersonalModalProps) {
  const { prefs, updatePrefs } = useProfile();
  const [name, setName] = useState(prefs.displayName);
  // Team challenges only accept the four precincts; an older free-text area starts unselected.
  const [area, setArea] = useState(Precinct.safeParse(prefs.area).success ? prefs.area : "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const nextName = name.trim();
    setNameError(nextName ? null : "Please enter a display name.");
    if (!nextName) return;
    setBusy(true);
    setSaveError(null);
    try {
      await updatePrefs({ displayName: nextName, ...(area && { area }) });
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Edit personal information"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AppButton>
          <AppButton variant="primary" onClick={() => void save()} loading={busy}>
            Save
          </AppButton>
        </>
      }
    >
      <div className="edit-avatar-preview">
        <Avatar name={name.trim() || prefs.displayName} />
        <span className="ui-meta-row">Avatar uses your initials.</span>
      </div>
      <FormField
        label="Display name"
        value={name}
        maxLength={MAX_NAME_LENGTH}
        onChange={(e) => setName(e.target.value)}
        error={nameError ?? undefined}
      />
      <fieldset className="chip-fieldset">
        <legend className="pref-row-label">Township / neighbourhood</legend>
        <div className="ui-chip-row ui-gap-2">
          {Precinct.options.map((precinct) => (
            <button
              key={precinct}
              type="button"
              className="ui-chip"
              aria-pressed={area === precinct}
              onClick={() => setArea(precinct)}
            >
              {precinct}
            </button>
          ))}
        </div>
        <p className="ui-helper">
          {area ? "Saved to your account." : "Choose your precinct to join team challenges"}
        </p>
      </fieldset>
      {saveError && (
        <p className="ui-error ui-flush" role="alert">
          {saveError}
        </p>
      )}
    </Modal>
  );
}
