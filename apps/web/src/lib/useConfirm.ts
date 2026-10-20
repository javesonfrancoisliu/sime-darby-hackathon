import { useCallback, useState } from "react";

import type { ReactNode } from "react";

// Configuration for a single yes/no confirmation request.
export type ConfirmRequest = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  // The action to run when the user confirms. May be async; the dialog shows a
  // busy state until it settles, then closes.
  onConfirm: () => void | Promise<void>;
};

export type ConfirmController = {
  // True while the dialog is shown.
  open: boolean;
  // True while an async confirmed action is still running.
  busy: boolean;
  // The active request's display config (null when closed).
  request: Omit<ConfirmRequest, "onConfirm"> | null;
  // Open the dialog for a given request.
  ask: (request: ConfirmRequest) => void;
  // Run the pending action (wired to the dialog's confirm button).
  confirm: () => void;
  // Dismiss without running the action (wired to the dialog's cancel button).
  cancel: () => void;
};

// Gates any action behind a yes/no confirmation. Call `ask({...})` from a
// button's onClick; the action only runs after the user presses the confirm
// button. Supports async actions via a busy flag so the button can show a
// spinner and stay disabled until the action settles.
export function useConfirm(): ConfirmController {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = useCallback((next: ConfirmRequest) => {
    setRequest(next);
  }, []);

  const cancel = useCallback(() => {
    if (busy) return;
    setRequest(null);
  }, [busy]);

  const confirm = useCallback(() => {
    if (!request || busy) return;
    const result = request.onConfirm();
    if (result instanceof Promise) {
      setBusy(true);
      void result.finally(() => {
        setBusy(false);
        setRequest(null);
      });
    } else {
      setRequest(null);
    }
  }, [request, busy]);

  const display = request
    ? {
        title: request.title,
        message: request.message,
        confirmLabel: request.confirmLabel,
        cancelLabel: request.cancelLabel,
        confirmVariant: request.confirmVariant,
      }
    : null;

  return { open: request !== null, busy, request: display, ask, confirm, cancel };
}
