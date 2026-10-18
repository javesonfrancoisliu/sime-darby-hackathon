import { useEffect, useRef } from "react";
import { DEMO_SECURITY_LINE, EMERGENCY_NUMBER } from "../config";
import { useAccessibility, type FontSizeLevel } from "../context/AccessibilityContext";
import {
  IconX,
  IconSun,
  IconVolume2,
  IconVolumeX,
  IconPhone,
  IconCheck,
} from "./Icons";

/**
 * Apple-style Accessibility Control Sheet for the Silver Generation.
 *
 * Implements:
 * - Dynamic Type typography scaling (Normal, Large, X-Large)
 * - High Contrast mode for elderly vision clarity
 * - Built-in Voice Read-Aloud Assistant (Web Speech API)
 * - Reduced Motion setting
 * - One-tap Elmina Township Emergency Hotline & 999 quick dial
 * - Translucent material depth (blur + saturate + subtle rim border)
 */
export function AccessibilitySheet() {
  const {
    isSheetOpen,
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

  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isSheetOpen) {
        closeSheet();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSheetOpen, closeSheet]);

  if (!isSheetOpen) return null;

  function handleVoiceToggle() {
    triggerHaptic(20);
    const next = !voiceAssist;
    setVoiceAssist(next);
    if (next) {
      speak("Voice assistance enabled. Text will be spoken aloud to guide you.");
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
      speak(`Text size set to ${level}`);
    }
  }

  return (
    <div
      className="apple-sheet-backdrop"
      onClick={closeSheet}
      role="dialog"
      aria-modal="true"
      aria-label="Accessibility and Senior Display Settings"
    >
      <div
        ref={sheetRef}
        className="apple-sheet-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle / grabber pill */}
        <div className="apple-sheet-grabber" aria-hidden="true" />

        {/* Sheet header */}
        <div className="apple-sheet-header">
          <div>
            <h2 className="apple-sheet-title">Senior Display &amp; Audio Assist</h2>
            <p className="apple-sheet-subtitle">Comfort settings for everyday ease</p>
          </div>
          <button
            type="button"
            className="apple-sheet-close-btn"
            onClick={closeSheet}
            aria-label="Close accessibility settings"
          >
            <IconX size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="apple-sheet-content">
          {/* ── 1. Dynamic Type (Text Sizing) ────────────────────── */}
          <div className="apple-control-group">
            <span className="apple-control-label">Text Size</span>
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

          {/* ── 2. High Contrast Mode ────────────────────────────── */}
          <div className="apple-control-row">
            <div className="apple-control-row__left">
              <span className="apple-control-row__icon" aria-hidden="true">
                <IconSun size={22} strokeWidth={1.8} />
              </span>
              <div>
                <span className="apple-control-row__title">High Contrast Mode</span>
                <span className="apple-control-row__desc">Bold borders and rich black text for low vision</span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={highContrast}
              aria-label="High Contrast Mode"
              className={`apple-switch${highContrast ? " apple-switch--on" : ""}`}
              onClick={handleContrastToggle}
            >
              <span className="apple-switch__thumb" />
            </button>
          </div>

          {/* ── 3. Voice Read-Aloud Assistant ───────────────────── */}
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
                <span className="apple-control-row__title">Voice Read-Aloud Assistant</span>
                <span className="apple-control-row__desc">
                  {isSpeaking ? "Speaking now… tap to pause" : "Spoken guidance for screen content"}
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={voiceAssist}
              aria-label="Voice Read-Aloud Assistant"
              className={`apple-switch${voiceAssist ? " apple-switch--on" : ""}`}
              onClick={handleVoiceToggle}
            >
              <span className="apple-switch__thumb" />
            </button>
          </div>

          {/* ── 4. Reduced Motion ───────────────────────────────── */}
          <div className="apple-control-row">
            <div className="apple-control-row__left">
              <div>
                <span className="apple-control-row__title">Gentle Transitions</span>
                <span className="apple-control-row__desc">Soft cross-fades instead of slides</span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              aria-label="Gentle Transitions"
              className={`apple-switch${reducedMotion ? " apple-switch--on" : ""}`}
              onClick={() => {
                triggerHaptic(15);
                setReducedMotion((v) => !v);
              }}
            >
              <span className="apple-switch__thumb" />
            </button>
          </div>

          {/* ── 5. Emergency Quick Dial for Silver Generation ─────── */}
          <div className="apple-emergency-box">
            <div className="apple-emergency-header">
              <IconPhone size={18} strokeWidth={2} />
              <span>Township Emergency Quick Dial</span>
            </div>
            <div className="apple-emergency-grid">
              <a href={`tel:${DEMO_SECURITY_LINE.tel}`} className="apple-emergency-btn">
                <span className="apple-emergency-btn__label">Township security (demo number)</span>
                <span className="apple-emergency-btn__number">{DEMO_SECURITY_LINE.display}</span>
              </a>
              <a href={`tel:${EMERGENCY_NUMBER}`} className="apple-emergency-btn apple-emergency-btn--danger">
                <span className="apple-emergency-btn__label">Medical &amp; Police (Emergency)</span>
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
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
