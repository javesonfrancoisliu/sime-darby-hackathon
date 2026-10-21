import { useCallback, useEffect, useRef, useState } from "react";
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
  // The form says whether leaving now may go ahead; false keeps the sheet open.
  const guard = useRef<() => boolean>(() => true);
  const setGuard = useCallback((next: () => boolean) => {
    guard.current = next;
  }, []);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit your details"
      canDismiss={() => guard.current()}
    >
      <EditForm resident={resident} onSaved={onClose} setGuard={setGuard} />
    </Sheet>
  );
}

type ParseError = NonNullable<ReturnType<typeof UpdateMeBody.safeParse>["error"]>;

// The first problem the contract found, in plain words, and which field it belongs to.
function validationProblem(error: ParseError): { field: "name" | "form"; message: string } {
  const issue = error.issues[0];
  if (issue?.path[0] === "name") {
    return {
      field: "name",
      message:
        issue.code === "too_big"
          ? `Please keep your name to ${MAX_NAME_LENGTH} letters or fewer.`
          : "Please type your name.",
    };
  }
  if (issue?.path[0] === "area") {
    return { field: "form", message: "Please choose one of the neighbourhoods." };
  }
  return { field: "form", message: "Please check your details and try again." };
}

function EditForm({
  resident,
  onSaved,
  setGuard,
}: {
  resident: User;
  onSaved: () => void;
  setGuard: (guard: () => boolean) => void;
}) {
  const { updateUser } = useSession();
  const announce = useAnnounce();
  const update = useMutation(meApi.update);
  const [name, setName] = useState(resident.name);
  const [area, setArea] = useState(resident.area);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [warned, setWarned] = useState(false);
  const warnedRef = useRef(false);

  const trimmed = name.trim();
  const dirty = trimmed !== resident.name || area !== resident.area;

  // Escape and a scrim tap ask first when there is typed text; a second try leaves.
  useEffect(() => {
    setGuard(() => {
      if (!dirty || warnedRef.current) return true;
      warnedRef.current = true;
      setWarned(true);
      return false;
    });
    return () => setGuard(() => true);
  }, [dirty, setGuard]);

  // Any further edit withdraws the warning.
  function edited() {
    warnedRef.current = false;
    setWarned(false);
  }

  async function save() {
    setNameError("");
    setFormError("");
    if (!trimmed) {
      setNameError("Please type your name.");
      return;
    }
    const changes: Record<string, string> = {};
    if (trimmed !== resident.name) changes.name = trimmed;
    if (area !== resident.area) changes.area = area;
    if (Object.keys(changes).length === 0) {
      announce("Nothing changed");
      onSaved();
      return;
    }
    const parsed = UpdateMeBody.safeParse(changes);
    if (!parsed.success) {
      const problem = validationProblem(parsed.error);
      if (problem.field === "name") setNameError(problem.message);
      else setFormError(problem.message);
      return;
    }
    const saved = await update.run(parsed.data);
    if (!saved) return;
    updateUser(saved);
    announce("Saved");
    onSaved();
  }

  return (
    <div className="apple-sheet-content">
      <TextField
        label="Your name"
        value={name}
        onChange={(value) => {
          setName(value);
          edited();
        }}
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
            onClick={() => {
              setArea(precinct);
              edited();
            }}
          >
            {precinct}
          </ChoiceButton>
        ))}
      </div>
      {warned ? (
        <Banner message="Your changes are not saved yet. Tap outside again to leave without saving, or tap Save." />
      ) : null}
      {formError ? <Banner message={formError} /> : null}
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
