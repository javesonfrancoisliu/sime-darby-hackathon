import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { takeOpener, useDialogLayer } from "./dialogLayer";
import { Button } from "./Button";

interface ConfirmDialogProps {
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  // Back, Escape, a scrim tap and the cancel button all land here.
  onCancel: () => void;
  // A confirmed action is running: the confirm button stays off so a second tap cannot repeat it.
  busy?: boolean;
  children?: ReactNode;
}

// Small confirm over whatever is open: Back and Escape close this first, focus starts on the safe
// choice, and only the sheets beneath it are made inert so they wake up again when it closes.
export function ConfirmDialog({
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [host] = useState<HTMLElement>(
    () => document.querySelector<HTMLElement>(".app-root") ?? document.body,
  );

  useEffect(() => {
    const opener = takeOpener();
    const beneath = Array.from(host.children).filter(
      (el) => el !== rootRef.current && !el.hasAttribute("inert"),
    );
    beneath.forEach((el) => el.setAttribute("inert", ""));
    cancelRef.current?.focus();
    return () => {
      beneath.forEach((el) => el.removeAttribute("inert"));
      if (opener?.isConnected) opener.focus();
    };
  }, [host]);

  useDialogLayer({ panelRef, onBack: onCancel, onEscape: onCancel });

  return createPortal(
    <div ref={rootRef} className="apple-sheet-backdrop" onClick={onCancel}>
      <div
        ref={panelRef}
        className="apple-sheet-panel call-confirm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apple-sheet-grabber" aria-hidden="true" />
        <div className="call-confirm">
          <h2 id={titleId} className="call-confirm__title">
            {title}
          </h2>
          {children ? <p className="call-confirm__sub">{children}</p> : null}
          <div className="call-confirm__actions">
            <Button block onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
              {confirmLabel}
            </Button>
            <button
              type="button"
              ref={cancelRef}
              className="ui-button ui-button--secondary call-confirm__cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    host,
  );
}
