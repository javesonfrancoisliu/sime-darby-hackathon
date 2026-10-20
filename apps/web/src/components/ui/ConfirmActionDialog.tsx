import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

import { AppButton } from "./AppButton";
import { Modal } from "./Modal";

export type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  // Label for the proceed button. Defaults to "Yes".
  confirmLabel?: string;
  // Label for the cancel button. Defaults to "No".
  cancelLabel?: string;
  // Visual weight of the proceed button. Use "danger" for destructive actions.
  confirmVariant?: "primary" | "danger";
  // Shown on the proceed button while the action runs.
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Yes/No confirmation asked BEFORE an action proceeds. Distinct from
// ConfirmationDialog, which reports success AFTER an action has run. Every
// state-changing action button routes its onClick through this so the user
// explicitly confirms before anything happens.
export function ConfirmActionDialog({
  open,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  confirmVariant = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <AppButton variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </AppButton>
          <AppButton variant={confirmVariant} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </AppButton>
        </>
      }
    >
      <div className="ui-confirm">
        <span className="ui-confirm-icon ui-confirm-icon--ask" aria-hidden="true">
          <HelpCircle size={56} />
        </span>
        <p className="ui-confirm-message" role="status">
          {message}
        </p>
      </div>
    </Modal>
  );
}
