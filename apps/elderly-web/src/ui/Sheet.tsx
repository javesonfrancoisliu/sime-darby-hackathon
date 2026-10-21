import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useAccessibility } from "../context/AccessibilityContext";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// One ease-out curve for every move of the sheet, in and out.
const SHEET_CURVE = "cubic-bezier(0.32, 0.72, 0, 1)";
const ENTER_MS = 320;
const EXIT_MS = 250;
const FADE_MS = 150;
// Let go past a quarter of the sheet, or faster than this, and it dismisses.
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY_PX_PER_MS = 0.5;
const VELOCITY_WINDOW_MS = 100;
const RUBBER_CONSTANT = 0.55;
// Timer slack after a transition so the finish callback never fires early.
const FINISH_SLACK_MS = 40;

// History entries this module pushed for sheets that are still open.
const openSheets = new Set<string>();

function translate(y: number): string {
  return `translate3d(0, ${y}px, 0)`;
}

// Where the panel is on screen right now, so a new move starts from there and never jumps.
function liveOffsetY(el: HTMLElement): number {
  const value = getComputedStyle(el).transform || el.style.transform;
  const matrix = /matrix(?:3d)?\(([^)]+)\)/.exec(value);
  if (matrix?.[1]) {
    const parts = matrix[1].split(",");
    return parseFloat(parts[parts.length === 6 ? 5 : 13] ?? "0") || 0;
  }
  const px = /,\s*(-?[\d.]+)px\s*,/.exec(value) ?? /translateY\((-?[\d.]+)px\)/.exec(value);
  return px?.[1] ? parseFloat(px[1]) : 0;
}

// Dragging up past the open position gets harder the further it goes.
function rubberband(overshoot: number, dimension: number): number {
  return (
    (overshoot * dimension * RUBBER_CONSTANT) / (dimension + RUBBER_CONSTANT * Math.abs(overshoot))
  );
}

function wantsFade(reducedMotion: boolean): boolean {
  return (
    reducedMotion ||
    (typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// Bottom sheet: grabber, title row with Done, scrim. Closes on Done, Escape, scrim tap, the phone
// back button and a downward drag. Keeps focus inside, locks the page behind it and gives focus back.
export function Sheet({ open, ...rest }: SheetProps) {
  return open ? <SheetBody {...rest} /> : null;
}

function SheetBody({ onClose, title, subtitle, children }: Omit<SheetProps, "open">) {
  const { reducedMotion } = useAccessibility();
  const titleId = useId();
  const sheetId = useId();
  const [host] = useState<HTMLElement>(
    () => document.querySelector<HTMLElement>(".app-root") ?? document.body,
  );
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const [fade] = useState(() => wantsFade(reducedMotion));

  const rootRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const token = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const closing = useRef(false);
  const popped = useRef(false);
  const offset = useRef(0);
  const drag = useRef<{
    pointerId: number;
    startY: number;
    base: number;
    height: number;
    samples: { t: number; y: number }[];
  } | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  function panelHeight(): number {
    return panelRef.current?.offsetHeight || window.innerHeight;
  }

  // Moves the sheet and scrim to a resting state; done runs once the move has finished.
  function settle(y: number, shown: number, done?: () => void) {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim) return;
    const current = ++token.current;
    window.clearTimeout(timer.current);
    const ms = fade ? FADE_MS : shown === 1 ? ENTER_MS : EXIT_MS;
    const curve = fade ? "ease-out" : SHEET_CURVE;
    panel.style.transition = `${fade ? "opacity" : "transform"} ${ms}ms ${curve}`;
    scrim.style.transition = `opacity ${ms}ms ${curve}`;
    if (fade) panel.style.opacity = String(shown);
    else panel.style.transform = translate(y);
    scrim.style.opacity = String(shown);
    offset.current = y;
    timer.current = window.setTimeout(() => {
      if (token.current === current) done?.();
    }, ms + FINISH_SLACK_MS);
  }

  function requestClose(fromBackButton = false) {
    if (closing.current) return;
    closing.current = true;
    if (fromBackButton) popped.current = true;
    settle(fade ? offset.current : panelHeight(), 0, () => onCloseRef.current());
  }

  // Slide up (or fade in) from where the sheet starts.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim) return;
    panel.style.transition = "none";
    scrim.style.transition = "none";
    scrim.style.opacity = "0";
    if (fade) panel.style.opacity = "0";
    else panel.style.transform = translate(panelHeight());
    void panel.offsetHeight;
    settle(0, 1);
    return () => {
      window.clearTimeout(timer.current);
    };
    // Runs once on mount; settle only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page behind: out of reach, not scrollable. Focus: into the sheet, then back to the opener.
  useEffect(() => {
    const root = rootRef.current;
    const background = Array.from(host.children).filter((el) => el !== root);
    background.forEach((el) => el.setAttribute("inert", ""));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    doneRef.current?.focus();
    return () => {
      background.forEach((el) => el.removeAttribute("inert"));
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [host, opener]);

  // The phone's back button closes the sheet; closing any other way pops the entry it pushed.
  useEffect(() => {
    openSheets.add(sheetId);
    const state: unknown = window.history.state;
    const base = state && typeof state === "object" ? state : {};
    if ((base as { sdhSheet?: string }).sdhSheet !== sheetId) {
      window.history.pushState({ ...base, sdhSheet: sheetId }, "");
    }
    const onPop = () => requestClose(true);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      openSheets.delete(sheetId);
      // Deferred so a development remount does not undo its own entry.
      window.setTimeout(() => {
        const current = window.history.state as { sdhSheet?: string } | null;
        if (!popped.current && !openSheets.has(sheetId) && current?.sdhSheet === sheetId) {
          window.history.back();
        }
      }, 0);
    };
    // Runs once on mount; requestClose only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId]);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    const items = Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panel?.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panel?.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim || (e.target as HTMLElement).closest("button")) return;
    // Grabbing mid-move stops it where it is, closing included.
    token.current++;
    window.clearTimeout(timer.current);
    closing.current = false;
    const base = fade ? 0 : liveOffsetY(panel);
    panel.style.transition = "none";
    scrim.style.transition = "none";
    if (!fade) panel.style.transform = translate(base);
    offset.current = base;
    drag.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      base,
      height: panelHeight(),
      samples: [{ t: performance.now(), y: e.clientY }],
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!state || !panel || !scrim || e.pointerId !== state.pointerId) return;
    const raw = state.base + (e.clientY - state.startY);
    const next = raw < 0 ? -rubberband(-raw, state.height) : raw;
    offset.current = next;
    if (fade) panel.style.opacity = String(1 - Math.min(1, Math.max(0, next) / state.height));
    else panel.style.transform = translate(next);
    scrim.style.opacity = String(1 - Math.min(1, Math.max(0, next) / state.height));
    const now = performance.now();
    state.samples.push({ t: now, y: e.clientY });
    while (state.samples.length > 2 && now - (state.samples[0]?.t ?? now) > VELOCITY_WINDOW_MS) {
      state.samples.shift();
    }
  }

  function handlePointerEnd(e: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || e.pointerId !== state.pointerId) return;
    drag.current = null;
    const first = state.samples[0];
    const last = state.samples[state.samples.length - 1];
    const elapsed = first && last ? last.t - first.t : 0;
    const velocity = first && last && elapsed > 0 ? (last.y - first.y) / elapsed : 0;
    const dismiss =
      e.type !== "pointercancel" &&
      (offset.current > state.height * DISMISS_FRACTION || velocity > DISMISS_VELOCITY_PX_PER_MS);
    if (dismiss) requestClose();
    else settle(0, 1);
  }

  return createPortal(
    <div ref={rootRef} className="apple-sheet-root" onKeyDown={handleKeyDown}>
      <div
        ref={scrimRef}
        className="apple-sheet-scrim"
        data-testid="sheet-scrim"
        onClick={() => requestClose()}
      />
      <div
        ref={panelRef}
        className="apple-sheet-panel apple-sheet-panel--live"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-motion={fade ? "fade" : "slide"}
      >
        <div
          className="apple-sheet-drag"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div className="apple-sheet-grabber" aria-hidden="true" />
          <div className="apple-sheet-header">
            <div>
              <h2 id={titleId} className="apple-sheet-title">
                {title}
              </h2>
              {subtitle ? <p className="apple-sheet-subtitle">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              ref={doneRef}
              className="apple-sheet-done"
              onClick={() => requestClose()}
            >
              Done
            </button>
          </div>
        </div>
        <div className="apple-sheet-body">{children}</div>
      </div>
    </div>,
    host,
  );
}
