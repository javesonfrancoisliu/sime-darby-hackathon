import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { AppButton } from "./AppButton";
import { Modal } from "./Modal";

export type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  // Label for the single dismiss button.
  closeLabel?: string;
  onClose: () => void;
};

// Success confirmation dialog: a prominent animated check, a short title and
// message, and one dismiss button. Used after an action succeeds (registering
// for an event, joining a volunteer activity) so the result is unmistakable.
export function ConfirmationDialog({
  open,
  title,
  message,
  closeLabel = "Done",
  onClose,
}: ConfirmationDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <AppButton variant="primary" onClick={onClose}>
          {closeLabel}
        </AppButton>
      }
    >
      <div className="ui-confirm">
        <span className="ui-confirm-icon" aria-hidden="true">
          <CheckCircle2 size={56} />
        </span>
        <p className="ui-confirm-message" role="status">
          {message}
        </p>
      </div>
    </Modal>
  );
}
