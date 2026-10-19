import { useState } from "react";

import type { ChallengeWithProgress } from "@sdh/contracts";

import { formatCount } from "../../lib/format";
import { AppButton, FormField, Modal } from "../ui";

export type LogProgressModalProps = {
  challenge: ChallengeWithProgress | null;
  current: number;
  onClose: () => void;
  onSave: (challenge: ChallengeWithProgress, value: number) => void;
  // True while the value is being saved.
  busy?: boolean;
  error?: string | null;
};

// Self-reported progress entry for a challenge. The parent passes `key={challenge.id}` so the
// field resets per challenge.
export function LogProgressModal({
  challenge,
  current,
  onClose,
  onSave,
  busy = false,
  error: saveError = null,
}: LogProgressModalProps) {
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);
  const overGoal = challenge !== null && Number(value) > challenge.goal.target;

  function submit() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a number of 0 or more.");
      return;
    }
    if (!Number.isInteger(n)) {
      setError("Use a whole number, with no decimals.");
      return;
    }
    if (n === 0) {
      setError("Enter a number above 0.");
      return;
    }
    // Anything over the goal counts as the goal.
    if (challenge) onSave(challenge, Math.min(n, challenge.goal.target));
  }

  return (
    <Modal
      open={challenge !== null}
      title="Log your progress"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AppButton>
          <AppButton variant="primary" onClick={submit} loading={busy}>
            Save progress
          </AppButton>
        </>
      }
    >
      {challenge && (
        <>
          <p className="ui-flush">
            Update your total {challenge.goal.unit} for <strong>{challenge.title}</strong> (goal:{" "}
            {formatCount(challenge.goal.target)}).
          </p>
          <FormField
            label={`Total ${challenge.goal.unit}`}
            type="number"
            inputMode="numeric"
            min={0}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            helper={
              overGoal
                ? `That is above the goal, so it counts as ${formatCount(challenge.goal.target)}.`
                : "You enter this yourself; it is not tracked automatically."
            }
            error={error ?? saveError ?? undefined}
          />
        </>
      )}
    </Modal>
  );
}
