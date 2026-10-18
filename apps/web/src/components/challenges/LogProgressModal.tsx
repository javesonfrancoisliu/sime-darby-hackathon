import { useState } from "react";

import type { Challenge } from "../../types/gamification";
import { AppButton, FormField, Modal } from "../ui";

export type LogProgressModalProps = {
  challenge: Challenge | null;
  current: number;
  onClose: () => void;
  onSave: (challenge: Challenge, value: number) => void;
};

// Self-reported progress entry for a challenge. Clearly simulated - this is not
// real fitness/step tracking. The parent passes `key={challenge.id}` so the
// field resets per challenge.
export function LogProgressModal({ challenge, current, onClose, onSave }: LogProgressModalProps) {
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a number of 0 or more.");
      return;
    }
    if (challenge) onSave(challenge, Math.round(n));
  }

  return (
    <Modal
      open={challenge !== null}
      title="Log your progress"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="primary" onClick={submit}>
            Save progress
          </AppButton>
        </>
      }
    >
      {challenge && (
        <>
          <p style={{ margin: 0 }}>
            Update your total {challenge.goal.unit} for <strong>{challenge.title}</strong>{" "}
            (goal: {challenge.goal.target}).
          </p>
          <FormField
            label={`Total ${challenge.goal.unit}`}
            type="number"
            inputMode="numeric"
            min={0}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            helper="Self-reported for this demo - not automatically tracked."
            error={error ?? undefined}
          />
        </>
      )}
    </Modal>
  );
}
