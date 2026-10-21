import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useAccessibility } from "../context/AccessibilityContext";
import { lockScroll, takeOpener, useDialogLayer } from "./dialogLayer";

// One ease-out curve for every move of the sheet, in and out.
const SHEET_CURVE = "cubic-bezier(0.32, 0.72, 0, 1)";
const ENTER_MS = 320;
const EXIT_MS = 250;
const FADE_MS = 150;
// Let go past a quarter of the sheet, or faster than this, and it dismisses.
const DISMISS_FRACTION = 0.25;
const DISMISS_VELOCITY_PX_PER_MS = 0.5;
// A flick only counts once the sheet has moved this far.
const DISMISS_MIN_PX = 24;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const VELOCITY_WINDOW_MS = 100;
const RUBBER_CONSTANT = 0.55;
// Timer slack after a transition so the finish callback never fires early.
const FINISH_SLACK_MS = 40;

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

function systemReducesMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches;
}

// Fade instead of slide when the app setting or the phone setting asks for less movement, live.
function useFade(reducedMotion: boolean): boolean {
  const [system, setSystem] = useState(systemReducesMotion);
  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!query?.addEventListener) return;
    const onChange = () => setSystem(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reducedMotion || system;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  // Asked before a scrim tap, Escape or a drag closes the sheet; false keeps it open.
  canDismiss?: () => boolean;
  children: ReactNode;
}

// Bottom sheet: grabber, title row with Done, scrim. Closes on Done, Escape, scrim tap, the phone
// back button and a downward drag. Keeps focus inside, locks the page behind it and gives focus back.
export function Sheet({ open, ...rest }: SheetProps) {
  return open ? <SheetBody {...rest} /> : null;
}

function SheetBody({ onClose, canDismiss, title, subtitle, children }: Omit<SheetProps, "open">) {
  const { reducedMotion } = useAccessibility();
  const titleId = useId();
  const [host] = useState<HTMLElement>(
    () => document.querySelector<HTMLElement>(".app-root") ?? document.body,
  );
  const fade = useFade(reducedMotion);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const canDismissRef = useRef(canDismiss);
  const shownFade = useRef(fade);
  const token = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const closing = useRef(false);
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
    canDismissRef.current = canDismiss;
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

  function requestClose() {
    if (closing.current) return;
    closing.current = true;
    settle(fade ? offset.current : panelHeight(), 0, () => onCloseRef.current());
  }

  // Escape, a scrim tap or a drag may be refused by the owner, for example to keep typed text.
  function requestDismiss() {
    if (canDismissRef.current && !canDismissRef.current()) return false;
    requestClose();
    return true;
  }

  useDialogLayer({ panelRef, onBack: requestClose, onEscape: () => void requestDismiss() });

  // The motion mode changed while open: carry on from the resting state of the new mode.
  useLayoutEffect(() => {
    if (shownFade.current === fade) return;
    shownFade.current = fade;
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transition = "none";
    if (fade) panel.style.transform = "";
    else panel.style.opacity = "";
    void panel.offsetHeight;
    if (closing.current) settle(fade ? 0 : panelHeight(), 0, () => onCloseRef.current());
    else settle(0, 1);
    // settle only reads refs and the current mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fade]);

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
    const opener = takeOpener();
    const background = Array.from(host.children).filter((el) => el !== root);
    background.forEach((el) => el.setAttribute("inert", ""));
    const unlock = lockScroll();
    doneRef.current?.focus();
    return () => {
      background.forEach((el) => el.removeAttribute("inert"));
      unlock();
      if (opener?.isConnected) opener.focus();
    };
  }, [host]);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
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
      (offset.current > state.height * DISMISS_FRACTION ||
        (offset.current > DISMISS_MIN_PX && velocity > DISMISS_VELOCITY_PX_PER_MS));
    if (!dismiss || !requestDismiss()) settle(0, 1);
  }

  return createPortal(
    <div ref={rootRef} className="apple-sheet-root">
      <div
        ref={scrimRef}
        className="apple-sheet-scrim"
        data-testid="sheet-scrim"
        onClick={() => requestDismiss()}
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
