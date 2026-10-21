import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { closeModal, isTopModal, openModal } from "./modalStack";

export type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Optional footer actions, e.g. buttons.
  footer?: ReactNode;
};

const HISTORY_KEY = "sdhModal";
let entryCounter = 0;

// Stop a popstate that only unwinds a modal's own history entry from reaching the router.
function swallowOnce(event: PopStateEvent): void {
  event.stopImmediatePropagation();
  window.removeEventListener("popstate", swallowOnce, true);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible dialog: labelled title, Escape closes only the topmost dialog,
// backdrop click closes, focus moves in once on open and returns on close,
// Tab stays inside and the page behind is inert while it is open. An open dialog owns
// one history entry, so browser Back closes it first and the entry is removed again
// when it closes by any other means.
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const titleId = useId();
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Callers pass inline handlers; reading the latest one here keeps the effect
  // below from re-running (and stealing focus) on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const entryRef = useRef({ token: "", active: false, mounted: false });

  useEffect(() => {
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    if (!open || !backdrop || !dialog) return;

    const id = Symbol("modal");
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openModal(id, backdrop);
    dialog.focus();

    const entry = entryRef.current;
    entry.mounted = true;
    if (!entry.active) {
      entry.token = `${++entryCounter}`;
      window.history.pushState({ ...window.history.state, [HISTORY_KEY]: entry.token }, "");
      entry.active = true;
    }

    // Back pops this dialog's entry: close the topmost dialog and keep the router out of it.
    function onPopState(event: PopStateEvent) {
      if (!entry.active || !isTopModal(id)) return;
      if (window.history.state?.[HISTORY_KEY] === entry.token) return;
      entry.active = false;
      event.stopImmediatePropagation();
      onCloseRef.current();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!dialog || !isTopModal(id)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const active = document.activeElement;
      const inside = active !== null && dialog.contains(active);
      if (event.shiftKey && (active === first || active === dialog || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState, true);
      entry.mounted = false;
      // Deferred so a same-tick re-run (Strict Mode) keeps the entry instead of popping it.
      queueMicrotask(() => {
        if (entry.mounted || !entry.active) return;
        entry.active = false;
        if (window.history.state?.[HISTORY_KEY] !== entry.token) return;
        window.addEventListener("popstate", swallowOnce, true);
        window.history.back();
      });
      closeModal(id);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ui-modal-head">
          <h2 className="ui-modal-title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="ui-icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
