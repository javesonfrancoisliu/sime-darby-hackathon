import { useEffect, useId, useRef } from "react";
import { DEMO_SECURITY_LINE, EMERGENCY_NUMBER } from "../config";
import { FONT_LABEL, useAccessibility, type FontSizeLevel } from "../context/AccessibilityContext";
import {
  IconX,
  IconSun,
  IconVolume2,
  IconVolumeX,
  IconPhone,
  IconCheck,
} from "./Icons";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Settings sheet. Focus moves to Close on open, Tab stays inside, Escape closes,
// the page behind is inert, and focus returns to the control that opened it.
export function AccessibilitySheet() {
  const { isSheetOpen } = useAccessibility();
  return isSheetOpen ? <SheetBody /> : null;
}

function SheetBody() {
  const {
    closeSheet,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    voiceAssist,
    setVoiceAssist,
    isSpeaking,
    speak,
    stopSpeaking,
    triggerHaptic,
  } = useAccessibility();

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const backdrop = backdropRef.current;
    const background = backdrop
      ? Array.from(backdrop.parentElement?.children ?? []).filter((el) => el !== backdrop)
      : [];
    background.forEach((el) => el.setAttribute("inert", ""));

    return () => {
      background.forEach((el) => el.removeAttribute("inert"));
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeSheet();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panelRef.current?.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  function handleVoiceToggle() {
    triggerHaptic(20);
    const next = !voiceAssist;
    setVoiceAssist(next);
    if (next) {
      speak("Read aloud is on.");
    } else {
      stopSpeaking();
    }
  }

  function handleContrastToggle() {
    triggerHaptic(20);
    setHighContrast((v) => !v);
  }

  function handleFontSizeChange(level: FontSizeLevel) {
    setFontSize(level);
    if (voiceAssist) {
      speak(`Text size set to ${FONT_LABEL[level]}`);
    }
  }

  return (
    <div ref={backdropRef} className="apple-sheet-backdrop" onClick={closeSheet} onKeyDown={handleKeyDown}>
      <div
        ref={panelRef}
        className="apple-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="apple-sheet-grabber" aria-hidden="true" />

        <div className="apple-sheet-header">
          <div>
            <h2 id={titleId} className="apple-sheet-title">Reading and sound</h2>
            <p className="apple-sheet-subtitle">Make the app easier to see and hear</p>
          </div>
          <button
            type="button"
            ref={closeRef}
            className="apple-sheet-close-btn"
            onClick={closeSheet}
            aria-label="Close settings"
          >
            <IconX size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="apple-sheet-content">
          <div className="apple-control-group">
            <span className="apple-control-label">Text size</span>
            <div className="apple-segmented-control" role="radiogroup" aria-label="Text size">
              {(
                [
                  { id: "normal", label: "Normal", sizeText: "A" },
                  { id: "large", label: "Large", sizeText: "A+" },
                  { id: "xlarge", label: "X-Large", sizeText: "A++" },
                ] as const
              ).map((opt) => {
                const isSelected = fontSize === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`apple-segment-btn${isSelected ? " apple-segment-btn--active" : ""}`}
                    onClick={() => handleFontSizeChange(opt.id)}
                  >
                    <span className="apple-segment-icon">{opt.sizeText}</span>
                    <span className="apple-segment-text">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="apple-control-row">
            <div className="apple-control-row__left">
              <span className="apple-control-row__icon" aria-hidden="true">
                <IconSun size={22} strokeWidth={1.8} />
              </span>
              <div>
                <span className="apple-control-row__title">Strong contrast</span>
                <span className="apple-control-row__desc">Bolder borders and darker text</span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={highContrast}
              aria-label="Strong contrast"
              className={`apple-switch${highContrast ? " apple-switch--on" : ""}`}
              onClick={handleContrastToggle}
            >
              <span className="apple-switch__thumb" />
            </button>
          </div>

          <div className="apple-control-row">
            <div className="apple-control-row__left">
              <span className="apple-control-row__icon" aria-hidden="true">
                {isSpeaking ? (
                  <IconVolume2 size={22} strokeWidth={2} />
                ) : (
                  <IconVolumeX size={22} strokeWidth={1.8} />
                )}
              </span>
              <div>
                <span className="apple-control-row__title">Read aloud</span>
                <span className="apple-control-row__desc">
                  {isSpeaking ? "Speaking now" : "Hear the screen spoken out loud"}
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={voiceAssist}
              aria-label="Read aloud"
              className={`apple-switch${voiceAssist ? " apple-switch--on" : ""}`}
              onClick={handleVoiceToggle}
            >
              <span className="apple-switch__thumb" />
            </button>
          </div>

          <div className="apple-control-row">
            <div className="apple-control-row__left">
              <div>
                <span className="apple-control-row__title">Less movement</span>
                <span className="apple-control-row__desc">Fewer slides and animations</span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              aria-label="Less movement"
              className={`apple-switch${reducedMotion ? " apple-switch--on" : ""}`}
              onClick={() => {
                triggerHaptic(15);
                setReducedMotion((v) => !v);
              }}
            >
              <span className="apple-switch__thumb" />
            </button>
          </div>

          <div className="apple-emergency-box">
            <div className="apple-emergency-header">
              <IconPhone size={18} strokeWidth={2} />
              <span>Quick dial</span>
            </div>
            <div className="apple-emergency-grid">
              <a href={`tel:${DEMO_SECURITY_LINE.tel}`} className="apple-emergency-btn">
                <span className="apple-emergency-btn__label">Township security (demo number)</span>
                <span className="apple-emergency-btn__number">{DEMO_SECURITY_LINE.display}</span>
              </a>
              <a href={`tel:${EMERGENCY_NUMBER}`} className="apple-emergency-btn apple-emergency-btn--danger">
                <span className="apple-emergency-btn__label">Emergency (police, ambulance, fire)</span>
                <span className="apple-emergency-btn__number">{EMERGENCY_NUMBER}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="apple-sheet-footer">
          <button
            type="button"
            className="ui-button ui-button--primary apple-sheet-done-btn"
            onClick={closeSheet}
          >
            <IconCheck size={18} strokeWidth={2} aria-hidden="true" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
