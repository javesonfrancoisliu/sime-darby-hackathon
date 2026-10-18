import { useState } from "react";

import type { AcceptedTask } from "../../data/AcceptedTasksContext";
import { AppButton, FormField, Modal } from "../ui";

// Mirrors the API: at most twice the planned duration, and never over 10 hours.
const MAX_OVERRUN_FACTOR = 2;
const MAX_MINUTES = 600;

export type CompleteTaskModalProps = {
  task: AcceptedTask | null;
  /** True while the completion is being saved. */
  busy?: boolean;
  /** Error from the last save attempt, shown under the field. */
  error?: string | null;
  onClose: () => void;
  onConfirm: (task: AcceptedTask, minutesSpent: number) => void;
};

/**
 * Volunteer-reported completion with the time actually spent (the API records
 * it as volunteer hours). Prefilled with the planned duration so the common case
 * is one tap. This is NOT verified: it does not award points. Points come only
 * after the simulated resident confirmation step.
 */
export function CompleteTaskModal({
  task,
  busy = false,
  error,
  onClose,
  onConfirm,
}: CompleteTaskModalProps) {
  const [minutes, setMinutes] = useState(() => String(task?.durationMinutes ?? ""));
  const max = task ? Math.min(task.durationMinutes * MAX_OVERRUN_FACTOR, MAX_MINUTES) : MAX_MINUTES;
  const value = Number(minutes);
  const valid = Number.isInteger(value) && value >= 1 && value <= max;

  return (
    <Modal
      open={task !== null}
      title="Mark task complete"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            loading={busy}
            disabled={!valid}
            onClick={() => task && onConfirm(task, value)}
          >
            Mark as completed
          </AppButton>
        </>
      }
    >
      {task && (
        <>
          <p style={{ margin: 0 }}>
            Mark <strong>{task.title}</strong> as completed?
          </p>
          <FormField
            label="Minutes spent"
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            helper={`Planned: ${task.durationMinutes} min. Counts toward your volunteer hours.`}
            error={
              error ??
              (minutes !== "" && !valid ? `Enter a whole number from 1 to ${max}.` : undefined)
            }
          />
          <p className="ui-helper">
            This is your own report. It is not yet verified and does not award points — the resident
            still needs to confirm.
          </p>
        </>
      )}
    </Modal>
  );
}
