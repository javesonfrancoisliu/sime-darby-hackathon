import type { AcceptedTask } from "../../data/AcceptedTasksContext";
import { AppButton, Modal } from "../ui";

export type CompleteTaskModalProps = {
  task: AcceptedTask | null;
  onClose: () => void;
  onConfirm: (task: AcceptedTask) => void;
};

/**
 * Simple self-reported completion confirmation. No minutes entry — completion is
 * a single confirm. This is explicitly SELF-REPORTED, not verified: it does not
 * award points. Points come only after the simulated resident verification step.
 */
export function CompleteTaskModal({ task, onClose, onConfirm }: CompleteTaskModalProps) {
  return (
    <Modal
      open={task !== null}
      title="Mark task complete"
      onClose={onClose}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="primary" onClick={() => task && onConfirm(task)}>
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
          <p className="ui-helper">
            This is your self-reported completion (demo). It is not yet verified and
            does not award points — the resident still needs to confirm.
          </p>
        </>
      )}
    </Modal>
  );
}
