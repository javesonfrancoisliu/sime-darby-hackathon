import { useState } from "react";

import { useProfile } from "../../data/ProfileContext";
import { AppButton, FormField, Modal } from "../ui";
import { Avatar } from "./Avatar";

export type EditPersonalModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Edit personal information: display name and area. The avatar is initials-based
 * and previews live from the name. Saved to the frontend profile store (demo).
 */
export function EditPersonalModal({ open, onClose }: EditPersonalModalProps) {
  const { prefs, updatePrefs } = useProfile();
  const [name, setName] = useState(prefs.displayName);
  const [area, setArea] = useState(prefs.area);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (name.trim().length === 0) {
      setError("Please enter a display name.");
      return;
    }
    updatePrefs({ displayName: name.trim(), area: area.trim() });
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Edit personal information"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="primary" onClick={save}>
            Save
          </AppButton>
        </>
      }
    >
      <div className="edit-avatar-preview">
        <Avatar name={name || "?"} />
        <span className="ui-meta-row">Avatar uses your initials.</span>
      </div>
      <FormField
        label="Display name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
      />
      <FormField
        label="Township / neighbourhood"
        value={area}
        onChange={(e) => setArea(e.target.value)}
        helper="Saved on this device for the demo."
      />
    </Modal>
  );
}
