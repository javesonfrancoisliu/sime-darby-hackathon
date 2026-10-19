import { useState } from "react";

import { errorMessage } from "@sdh/api-client";
import { MAX_NAME_LENGTH } from "@sdh/contracts";

import { useProfile } from "../../data/ProfileContext";
import { AppButton, FormField, Modal } from "../ui";
import { Avatar } from "./Avatar";

export type EditPersonalModalProps = {
  open: boolean;
  onClose: () => void;
};

// Edit display name and area. The avatar is initials-based and previews live.
export function EditPersonalModal({ open, onClose }: EditPersonalModalProps) {
  const { prefs, updatePrefs } = useProfile();
  const [name, setName] = useState(prefs.displayName);
  const [area, setArea] = useState(prefs.area);
  const [nameError, setNameError] = useState<string | null>(null);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const nextName = name.trim();
    const nextArea = area.trim();
    setNameError(nextName ? null : "Please enter a display name.");
    setAreaError(nextArea ? null : "Please enter your township or neighbourhood.");
    if (!nextName || !nextArea) return;
    setBusy(true);
    setSaveError(null);
    try {
      await updatePrefs({ displayName: nextName, area: nextArea });
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
      <FormField
        label="Township / neighbourhood"
        value={area}
        maxLength={MAX_NAME_LENGTH}
        onChange={(e) => setArea(e.target.value)}
        error={areaError ?? undefined}
        helper="Saved to your account."
      />
      {saveError && (
        <p className="ui-error ui-flush" role="alert">
          {saveError}
        </p>
      )}
    </Modal>
  );
}
