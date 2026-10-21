import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { takeOpener, useDialogLayer } from "./dialogLayer";
import { IconPhone, IconChevronRight, IconX, IconCheck } from "./Icons";

interface CallTarget {
  /** Digits to dial, e.g. "999" or "0355500100". */
  tel: string;
  /** Spoken/visible number, e.g. "999" or "03-5550 0100". */
  display: string;
  /** What this number is, e.g. "Emergency services" or "Township security". */
  label: string;
  /** Optional one-line note, e.g. "Police, ambulance or fire". */
  note?: string;
  /** Treat as a high-urgency (red) emergency call. */
  danger?: boolean;
}

interface CallConfirmContextValue {
  /** Open the confirm sheet before a call is placed. */
  requestCall: (target: CallTarget) => void;
}

const CallConfirmContext = createContext<CallConfirmContextValue | null>(null);

// Opens the phone's dialler through a tel: link, so the page itself is never replaced.
export function dialNumber(tel: string) {
  if (typeof document === "undefined") return;
  const link = document.createElement("a");
  link.href = `tel:${tel}`;
  link.click();
}

/**
 * Provides a single confirm-before-dial bottom sheet for every emergency /
 * phone call in the app. Call requestCall({...}) from any button; the sheet
 * mounts once here. The call is placed only after a deliberate slide-to-confirm
 * gesture, so a mis-tap never dials (apple-design: agency + forgiveness).
 */
export function CallConfirmProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<CallTarget | null>(null);

  const requestCall = useCallback((t: CallTarget) => setTarget(t), []);
  const close = useCallback(() => setTarget(null), []);

  return (
    <CallConfirmContext.Provider value={{ requestCall }}>
      {children}
      {target ? <CallConfirmSheet target={target} onClose={close} /> : null}
    </CallConfirmContext.Provider>
  );
}

export function useCallConfirm(): CallConfirmContextValue {
  const ctx = useContext(CallConfirmContext);
  // Fallback for isolated tests without the provider: dial directly.
  if (!ctx) {
    return {
      requestCall: (t) => dialNumber(t.tel),
    };
  }
  return ctx;
}

function CallConfirmSheet({ target, onClose }: { target: CallTarget; onClose: () => void }) {
  const { triggerHaptic } = useAccessibility();
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  // Place the call once the slider is confirmed.
  const placeCall = useCallback(() => {
    triggerHaptic(30);
    dialNumber(target.tel);
    // Close shortly after so the dial handoff happens first.
    window.setTimeout(onClose, 150);
  }, [target.tel, triggerHaptic, onClose]);

  // Focus Cancel on open (the safe default — the call needs a deliberate slide),
  // trap Tab, make the page behind inert, and restore focus on close.
  useEffect(() => {
    const trigger = takeOpener();
    cancelRef.current?.focus();
    triggerHaptic(15);

    const backdrop = backdropRef.current;
    const background = backdrop
      ? Array.from(backdrop.parentElement?.children ?? []).filter((el) => el !== backdrop)
      : [];
    background.forEach((el) => el.setAttribute("inert", ""));

    return () => {
      background.forEach((el) => el.removeAttribute("inert"));
      if (trigger?.isConnected) trigger.focus();
    };
  }, [triggerHaptic]);

  // Back and Escape close this confirm before any sheet underneath it.
  useDialogLayer({ panelRef, onBack: onClose, onEscape: onClose });

  return (
    <div ref={backdropRef} className="apple-sheet-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="apple-sheet-panel call-confirm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apple-sheet-grabber" aria-hidden="true" />

        <div className="call-confirm">
          <span
            className={`call-confirm__icon${target.danger ? " call-confirm__icon--danger" : ""}`}
            aria-hidden="true"
          >
            <IconPhone size={32} strokeWidth={2.2} />
          </span>

          <h2 id={titleId} className="call-confirm__title">
            Call {target.display}?
          </h2>
          <p id={descId} className="call-confirm__sub">
            {target.label}
            {target.note ? ` · ${target.note}` : ""}
          </p>

          <div className="call-confirm__actions">
            <SlideToConfirm
              label={`Slide to call ${target.display}`}
              danger={target.danger}
              onConfirm={placeCall}
            />
            <button
              type="button"
              ref={cancelRef}
              className="ui-button ui-button--secondary call-confirm__cancel"
              onClick={onClose}
            >
              <IconX size={18} strokeWidth={2.2} aria-hidden="true" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SlideToConfirmProps {
  label: string;
  danger?: boolean;
  onConfirm: () => void;
}

// Portion of the track the knob must cross to commit (0–1).
const COMMIT_THRESHOLD = 0.9;

/**
 * Slide-to-confirm: drag the knob from left to right across the track to
 * commit. apple-design: feedback is continuous and 1:1 with the pointer (§1,
 * §2); the knob rubber-bands at the ends and springs back on an early release
 * (§3, §9); the gesture carries intent so a tap alone never fires. Keyboard
 * users get Enter/Space/→ as an equivalent commit (§16 agency).
 */
function SlideToConfirm({ label, danger, onConfirm }: SlideToConfirmProps) {
  const { triggerHaptic, reducedMotion } = useAccessibility();
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const committedRef = useRef(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function maxTravel(): number {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return 1;
    return Math.max(track.clientWidth - knob.clientWidth - 8, 1);
  }

  function commit() {
    if (committedRef.current) return;
    committedRef.current = true;
    setConfirmed(true);
    setProgress(1);
    triggerHaptic(30);
    onConfirm();
  }

  function onPointerDown(e: React.PointerEvent) {
    if (committedRef.current) return;
    draggingRef.current = true;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const knobW = knobRef.current?.clientWidth ?? 56;
    // Position the knob centre under the finger, clamped to the travel range.
    const x = e.clientX - rect.left - knobW / 2;
    const p = Math.min(Math.max(x / maxTravel(), 0), 1);
    setProgress(p);
  }

  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (progress >= COMMIT_THRESHOLD) {
      commit();
    } else {
      // Not far enough — spring back to the start.
      setProgress(0);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (committedRef.current) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "End") {
      e.preventDefault();
      commit();
    }
  }

  const pct = Math.round(progress * 100);

  return (
    <div
      ref={trackRef}
      className={`slide-confirm${danger ? " slide-confirm--danger" : ""}${
        dragging ? " slide-confirm--dragging" : ""
      }${confirmed ? " slide-confirm--confirmed" : ""}${reducedMotion ? " slide-confirm--rm" : ""}`}
      style={{ ["--knob-progress" as string]: String(progress) }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={confirmed ? "Calling" : `${pct} percent — slide to the end to call`}
      onKeyDown={onKeyDown}
    >
      {/* Filled trail that follows the knob. */}
      <div className="slide-confirm__fill" />
      <span className="slide-confirm__label">{confirmed ? "Calling…" : label}</span>
      <div
        ref={knobRef}
        className="slide-confirm__knob"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-hidden="true"
      >
        {confirmed ? (
          <IconCheck size={24} strokeWidth={2.6} />
        ) : (
          <IconChevronRight size={24} strokeWidth={2.6} />
        )}
      </div>
    </div>
  );
}
