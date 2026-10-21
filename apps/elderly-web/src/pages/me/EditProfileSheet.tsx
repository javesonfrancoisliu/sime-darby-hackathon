import { useState } from "react";
import { useSession } from "@sdh/api-client";
import { MAX_NAME_LENGTH, Precinct, UpdateMeBody, type User } from "@sdh/contracts";
import { meApi } from "../../api/me";
import { useMutation } from "../../hooks/useMutation";
import { useAnnounce } from "../../ui/Announcer";
import { Banner } from "../../ui/Banner";
import { ChoiceButton } from "../../ui/ChoiceButton";
import { Sheet } from "../../ui/Sheet";
import { TextField } from "../../ui/TextField";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  resident: User;
}

// Change the name and neighbourhood. Only what changed is sent.
export function EditProfileSheet({ open, onClose, resident }: EditProfileSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit your details">
      <EditForm resident={resident} onSaved={onClose} />
    </Sheet>
  );
}

function EditForm({ resident, onSaved }: { resident: User; onSaved: () => void }) {
  const { updateUser } = useSession();
  const announce = useAnnounce();
  const update = useMutation(meApi.update);
  const [name, setName] = useState(resident.name);
  const [area, setArea] = useState(resident.area);
  const [nameError, setNameError] = useState("");

  async function save() {
    const changes: Record<string, string> = {};
    if (name.trim() !== resident.name) changes.name = name;
    if (area !== resident.area) changes.area = area;
    const parsed = UpdateMeBody.safeParse(changes);
    if (!name.trim()) {
      setNameError("Please type your name.");
      return;
    }
    if (!parsed.success) {
      if (Object.keys(changes).length === 0) {
        onSaved();
        return;
      }
      setNameError(`Please keep your name to ${MAX_NAME_LENGTH} letters or fewer.`);
      return;
    }
    setNameError("");
    const saved = await update.run(parsed.data);
    if (!saved) return;
    updateUser(saved);
    announce("Your details were saved.");
    onSaved();
  }

  return (
    <div className="apple-sheet-content">
      <TextField
        label="Your name"
        value={name}
        onChange={setName}
        error={nameError}
        placeholder="Type your name"
        maxLength={MAX_NAME_LENGTH}
      />
      <div role="group" aria-label="Your neighbourhood" className="ui-stack">
        <span className="apple-control-label">Your neighbourhood</span>
        {Precinct.options.map((precinct) => (
          <ChoiceButton
            key={precinct}
            selected={area === precinct}
            onClick={() => setArea(precinct)}
          >
            {precinct}
          </ChoiceButton>
        ))}
      </div>
      {update.status === "error" ? (
        <Banner message={update.error?.message ?? "We could not save your details."} />
      ) : null}
      <button
        type="button"
        className="ui-button ui-button--primary"
        disabled={update.status === "loading"}
        onClick={() => void save()}
      >
        Save
      </button>
    </div>
  );
}
