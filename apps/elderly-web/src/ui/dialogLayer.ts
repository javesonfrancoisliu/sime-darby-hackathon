import { useEffect, useId, useRef, type RefObject } from "react";
import { pageIsLeaving } from "./pageLeave";

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Key on history.state that marks the entry a dialog pushed.
const MARKER = "sdhSheet";
const TRIGGER = 'button, a[href], input, summary, [role="button"], [tabindex]';

// Open dialogs, topmost last. Back, Escape and Tab belong to the topmost one only.
const stack: string[] = [];

let lastTrigger: HTMLElement | null = null;
let scrollLocks = 0;
let savedOverflow = "";

function stateObject(): Record<string, unknown> {
  const state: unknown = window.history.state;
  return state && typeof state === "object" ? { ...(state as Record<string, unknown>) } : {};
}

function marker(): string | undefined {
  const value = stateObject()[MARKER];
  return typeof value === "string" ? value : undefined;
}

function dropMarker() {
  const base = stateObject();
  delete base[MARKER];
  window.history.replaceState(base, "");
}

// True while a popstate caused by a dialog removing its own entry is being delivered, so the
// dialog underneath does not mistake it for the phone's Back button.
let selfPop = false;
const SELF_POP_LISTEN_MS = 1000;

// Steps back off the entry this dialog pushed, marking the resulting popstate as its own.
function backOffOwnEntry() {
  const mark = () => {
    selfPop = true;
    window.setTimeout(() => {
      selfPop = false;
    }, 0);
    window.removeEventListener("popstate", mark, true);
  };
  window.addEventListener("popstate", mark, true);
  window.setTimeout(() => window.removeEventListener("popstate", mark, true), SELF_POP_LISTEN_MS);
  window.history.back();
}

// True when the entry on top of the history belongs to a dialog that is open right now.
export function topEntryIsOpenDialog(): boolean {
  const current = marker();
  return current !== undefined && stack.includes(current);
}

// A reload keeps the entry a dialog pushed but not the dialog. Step back off it once so the
// first Back press leaves the page instead of doing nothing.
export function dropStaleEntry() {
  const current = marker();
  if (!current || stack.includes(current)) return;
  dropMarker();
  window.history.back();
}

if (typeof window !== "undefined") {
  dropStaleEntry();
  // Safari does not focus a button on click, so the opener is taken from the click itself.
  document.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof Element ? event.target.closest<HTMLElement>(TRIGGER) : null;
      if (target) lastTrigger = target;
    },
    true,
  );
}

// The element the person clicked to open a dialog, else whatever has focus.
export function takeOpener(): HTMLElement | null {
  if (lastTrigger?.isConnected) return lastTrigger;
  return document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : null;
}

// Stops the page behind from scrolling; two dialogs share one lock.
export function lockScroll(): () => void {
  if (scrollLocks === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLocks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLocks -= 1;
    if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
  };
}

interface DialogLayerOptions {
  panelRef: RefObject<HTMLElement | null>;
  // The phone's Back button reached this dialog; its history entry is already gone. Return true to
  // keep the dialog open: its entry is pushed again so the next Back asks again.
  onBack: () => boolean | void;
  onEscape: () => void;
}

// History entry, Back, Escape and the Tab trap for one open dialog. Listens on the document so
// keys still work when focus has fallen to the body.
export function useDialogLayer({ panelRef, onBack, onEscape }: DialogLayerOptions) {
  const id = useId();
  const handlers = useRef({ onBack, onEscape });
  const popped = useRef(false);

  useEffect(() => {
    handlers.current = { onBack, onEscape };
  });

  useEffect(() => {
    stack.push(id);
    if (marker() !== id) {
      const current = marker();
      if (current && !stack.includes(current)) dropMarker();
      window.history.pushState({ ...stateObject(), [MARKER]: id }, "");
    }

    const isTop = () => stack[stack.length - 1] === id;

    const onPop = () => {
      if (selfPop || !isTop()) return;
      if (handlers.current.onBack() === true) {
        window.history.pushState({ ...stateObject(), [MARKER]: id }, "");
        return;
      }
      popped.current = true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        handlers.current.onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      const items = Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      const outside = !panel?.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKeyDown);
      const at = stack.lastIndexOf(id);
      if (at >= 0) stack.splice(at, 1);
      // Deferred so a development remount does not undo its own entry; skipped while the page is
      // leaving so the unwind cannot cancel the navigation.
      window.setTimeout(() => {
        if (!popped.current && !stack.includes(id) && marker() === id && !pageIsLeaving()) {
          backOffOwnEntry();
        }
      }, 0);
    };
  }, [id, panelRef]);
}
