import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { pageIsLeaving } from "../../lib/pageLeave";
import { closeModal, isTopModal, openModal } from "./modalStack";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  // The app "Less movement" choice; the system setting is always followed as well.
  reducedMotion?: boolean;
  // The element that opened the sheet, stored by its click handler. Focus returns to it on close.
  openerRef?: RefObject<HTMLElement | null>;
};

const HISTORY_KEY = "sdhSheet";
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// One ease-out curve for every move of the sheet, in and out.
const SHEET_CURVE = "cubic-bezier(0.32, 0.72, 0, 1)";
const ENTER_MS = 320;
const EXIT_MS = 250;
const FADE_MS = 150;
// Let go past a quarter of the sheet, or past a small distance at speed, and it dismisses.
const DISMISS_FRACTION = 0.25;
const DISMISS_MIN_PX = 24;
const DISMISS_VELOCITY_PX_PER_MS = 0.5;
const VELOCITY_WINDOW_MS = 100;
const RUBBER_CONSTANT = 0.55;
// Timer slack after a transition so the finish callback never fires early.
const FINISH_SLACK_MS = 40;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

let entryCounter = 0;
// History markers of sheets that are open right now.
const liveTokens = new Set<string>();

function currentToken(): string | undefined {
  const state: unknown = window.history.state;
  if (!state || typeof state !== "object") return undefined;
  const token = (state as Record<string, unknown>)[HISTORY_KEY];
  return typeof token === "string" ? token : undefined;
}

function stateBase(): object {
  const state: unknown = window.history.state;
  return state && typeof state === "object" ? state : {};
}

function isStale(token: string | undefined): token is string {
  return token !== undefined && !liveTokens.has(token);
}

// After a reload the current history entry can still carry the marker of a sheet that is gone.
// Stepping back over it keeps the first Back press from doing nothing. Call once at start-up.
export function dropStaleSheetEntry(): void {
  if (isStale(currentToken())) window.history.back();
}

// Going Back onto an entry whose sheet is gone (for example after leaving through a link in the
// sheet) would be a dead press, so step over it.
if (typeof window !== "undefined") {
  window.addEventListener(
    "popstate",
    () => {
      if (isStale(currentToken())) window.history.back();
    },
    true,
  );
}

// Stop a popstate that only unwinds a sheet's own history entry from reaching the router.
function swallowOnce(event: PopStateEvent): void {
  event.stopImmediatePropagation();
  window.removeEventListener("popstate", swallowOnce, true);
}

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

// The system reduced-motion choice, kept in step while the sheet is open.
function useSystemReducedMotion(): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches,
  );
  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return matches;
}

// Bottom sheet: grabber, title row with Done, scrim. Closes on Done, Escape, scrim tap, the phone
// back button and a downward drag. Keeps focus inside, locks the page behind it and gives focus back.
export function Sheet({ open, ...rest }: SheetProps) {
  return open ? <SheetBody {...rest} /> : null;
}

function SheetBody({
  onClose,
  title,
  subtitle,
  children,
  reducedMotion = false,
  openerRef,
}: Omit<SheetProps, "open">) {
  const systemReduced = useSystemReducedMotion();
  const fade = reducedMotion || systemReduced;
  const titleId = useId();
  const [host] = useState<HTMLElement>(
    () => document.querySelector<HTMLElement>(".app-shell") ?? document.body,
  );

  const idRef = useRef(Symbol("sheet"));
  const rootRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const fadeRef = useRef(fade);
  const closeRef = useRef<() => void>(() => {});
  const entryRef = useRef({ token: "", active: false, mounted: false });
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
    fadeRef.current = fade;
    closeRef.current = requestClose;
  });

  function panelHeight(): number {
    return panelRef.current?.offsetHeight || window.innerHeight;
  }

  // Moves the sheet and scrim to a resting state; done runs once the move has finished.
  function settle(y: number, shown: number, done?: () => void) {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim) return;
    const useFade = fadeRef.current;
    const current = ++token.current;
    window.clearTimeout(timer.current);
    const ms = useFade ? FADE_MS : shown === 1 ? ENTER_MS : EXIT_MS;
    const curve = useFade ? "ease-out" : SHEET_CURVE;
    panel.style.transition = `${useFade ? "opacity" : "transform"} ${ms}ms ${curve}`;
    scrim.style.transition = `opacity ${ms}ms ${curve}`;
    if (useFade) panel.style.opacity = String(shown);
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
    settle(fadeRef.current ? offset.current : panelHeight(), 0, () => onCloseRef.current());
  }

  // Slide up (or fade in) from where the sheet starts.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim) return;
    panel.style.transition = "none";
    scrim.style.transition = "none";
    scrim.style.opacity = "0";
    if (fadeRef.current) panel.style.opacity = "0";
    else panel.style.transform = translate(panelHeight());
    void panel.offsetHeight;
    settle(0, 1);
    return () => {
      window.clearTimeout(timer.current);
    };
  }, []);

  // A live change of the motion setting while open: switch to the other kind of move at once.
  const firstMotion = useRef(true);
  useEffect(() => {
    if (firstMotion.current) {
      firstMotion.current = false;
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    token.current++;
    window.clearTimeout(timer.current);
    panel.style.transition = "none";
    offset.current = 0;
    if (fade) {
      panel.style.transform = "";
      panel.style.opacity = "1";
    } else {
      panel.style.opacity = "";
      panel.style.transform = translate(0);
    }
    if (closing.current) {
      closing.current = false;
      requestClose();
    }
    // Only the motion kind matters here; the rest is read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fade]);

  // Page behind: out of reach, not scrollable. Focus: into the sheet, then back to the opener.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const id = idRef.current;
    const active = document.activeElement;
    // The opener stored by its click handler; the focused element is the fallback.
    const opener = openerRef?.current ?? (active instanceof HTMLElement ? active : null);
    openModal(id, root);
    doneRef.current?.focus();
    return () => {
      closeModal(id);
      if (opener?.isConnected) opener.focus();
    };
  }, [openerRef]);

  // Escape and the Tab trap listen on the document, so they work after focus has fallen to body.
  useEffect(() => {
    const id = idRef.current;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || !isTopModal(id)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement;
      const inside = active !== null && panel.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // The phone's back button closes the sheet; closing any other way pops the entry it pushed.
  useEffect(() => {
    const id = idRef.current;
    const entry = entryRef.current;
    entry.mounted = true;
    if (!entry.active) {
      entry.token = `${++entryCounter}`;
      const next = { ...stateBase(), [HISTORY_KEY]: entry.token };
      // A marker left by a reload is reused instead of stacking another entry on it.
      if (isStale(currentToken())) window.history.replaceState(next, "");
      else window.history.pushState(next, "");
      liveTokens.add(entry.token);
      entry.active = true;
    }

    function onPopState(event: PopStateEvent) {
      if (!entry.active || !isTopModal(id)) return;
      if (currentToken() === entry.token) return;
      entry.active = false;
      liveTokens.delete(entry.token);
      event.stopImmediatePropagation();
      closeRef.current();
    }
    window.addEventListener("popstate", onPopState, true);
    return () => {
      window.removeEventListener("popstate", onPopState, true);
      entry.mounted = false;
      // Deferred so a same-tick re-run (Strict Mode) keeps the entry instead of popping it.
      queueMicrotask(() => {
        if (entry.mounted || !entry.active) return;
        entry.active = false;
        liveTokens.delete(entry.token);
        if (currentToken() !== entry.token || pageIsLeaving()) return;
        window.addEventListener("popstate", swallowOnce, true);
        window.history.back();
      });
    };
  }, []);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim || e.button !== 0 || e.isPrimary === false) return;
    if ((e.target as HTMLElement).closest("button")) return;
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
    const shown = String(1 - Math.min(1, Math.max(0, next) / state.height));
    if (fade) panel.style.opacity = shown;
    else panel.style.transform = translate(next);
    scrim.style.opacity = shown;
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
    const far = offset.current > state.height * DISMISS_FRACTION;
    const flicked = offset.current > DISMISS_MIN_PX && velocity > DISMISS_VELOCITY_PX_PER_MS;
    if (e.type !== "pointercancel" && (far || flicked)) requestClose();
    else settle(0, 1);
  }

  return createPortal(
    <div ref={rootRef} className="ui-sheet-root">
      <div
        ref={scrimRef}
        className="ui-sheet-scrim"
        data-testid="sheet-scrim"
        onClick={() => requestClose()}
      />
      <div
        ref={panelRef}
        className="ui-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-motion={fade ? "fade" : "slide"}
      >
        <div
          className="ui-sheet-drag"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div className="ui-sheet-grabber" aria-hidden="true" />
          <div className="ui-sheet-head">
            <div>
              <h2 id={titleId} className="ui-sheet-title">
                {title}
              </h2>
              {subtitle ? <p className="ui-sheet-subtitle">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              ref={doneRef}
              className="ui-sheet-done"
              onClick={() => requestClose()}
            >
              Done
            </button>
          </div>
        </div>
        <div className="ui-sheet-body">{children}</div>
      </div>
    </div>,
    host,
  );
}
