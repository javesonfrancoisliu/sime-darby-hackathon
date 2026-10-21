import { useState, type RefObject } from "react";

import { errorMessage } from "@sdh/api-client";
import { MAX_NAME_LENGTH, Precinct } from "@sdh/contracts";

import { useProfile } from "../../data/ProfileContext";
import { useConfirm } from "../../lib/useConfirm";
import { AppButton, ConfirmActionDialog, FormField, Sheet } from "../ui";
import { Avatar } from "./Avatar";

export type EditPersonalSheetProps = {
  onClose: () => void;
  openerRef: RefObject<HTMLElement | null>;
  // Called after the details are saved.
  onSaved?: () => void;
};

// Edit display name and precinct in a bottom drawer. The avatar is initials-based and previews
// live. Closing with typed or changed values asks before they are thrown away.
export function EditPersonalSheet({ onClose, openerRef, onSaved }: EditPersonalSheetProps) {
  const { prefs, updatePrefs } = useProfile();
  // Team challenges only accept the four precincts; an older free-text area starts unselected.
  const startArea = Precinct.safeParse(prefs.area).success ? prefs.area : "";
  const [name, setName] = useState(prefs.displayName);
  const [area, setArea] = useState(startArea);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const dirty = name !== prefs.displayName || area !== startArea;

  // Returns true when the close was held back to ask first.
  function askBeforeClosing(): boolean {
    if (!dirty || busy) return false;
    if (!confirm.open) {
      confirm.ask({
        title: "Discard changes?",
        message: "Your changes have not been saved.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        confirmVariant: "danger",
        onConfirm: onClose,
      });
    }
    return true;
  }

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
    <>
      <Sheet
        open
        onClose={onClose}
        openerRef={openerRef}
        title="Edit personal information"
        guardClose={askBeforeClosing}
      >
        <div className="sheet-stack">
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
          <div className="ui-modal-foot">
            <AppButton
              variant="ghost"
              onClick={() => !askBeforeClosing() && onClose()}
              disabled={busy}
            >
              Cancel
            </AppButton>
            <AppButton variant="primary" onClick={() => void save()} loading={busy}>
              Save
            </AppButton>
          </div>
        </div>
      </Sheet>
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
