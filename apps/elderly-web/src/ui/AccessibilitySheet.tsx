import { EMERGENCY_NUMBER } from "../config";
import { useTownship } from "../hooks/useTownship";
import { FONT_LABEL, useAccessibility, type FontSizeLevel } from "../context/AccessibilityContext";
import { IconSun, IconVolume2, IconVolumeX, IconPhone } from "./Icons";
import { Sheet } from "./Sheet";
import { useCallConfirm } from "./CallConfirm";

// Settings sheet: the shared Sheet holding text size, contrast, read aloud, less movement and quick dial.
export function AccessibilitySheet() {
  const { isSheetOpen, closeSheet } = useAccessibility();
  return (
    <Sheet
      open={isSheetOpen}
      onClose={closeSheet}
      title="Reading and sound"
      subtitle="Make the app easier to see and hear"
    >
      <SheetContent />
    </Sheet>
  );
}

function SheetContent() {
  const {
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

  const securityLine = useTownship().data?.securityLine;
  const { requestCall } = useCallConfirm();

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
    <>
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
            {securityLine ? (
              <button
                type="button"
                className="apple-emergency-btn"
                onClick={() =>
                  requestCall({
                    tel: securityLine.tel,
                    display: securityLine.display,
                    label: "Township security",
                    note: "24/7 township hotline",
                  })
                }
              >
                <span className="apple-emergency-btn__label">Township security</span>
                <span className="apple-emergency-btn__number">{securityLine.display}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="apple-emergency-btn apple-emergency-btn--danger"
              onClick={() =>
                requestCall({
                  tel: EMERGENCY_NUMBER,
                  display: EMERGENCY_NUMBER,
                  label: "Emergency services",
                  note: "Police, ambulance or fire",
                  danger: true,
                })
              }
            >
              <span className="apple-emergency-btn__label">
                Emergency (police, ambulance, fire)
              </span>
              <span className="apple-emergency-btn__number">{EMERGENCY_NUMBER}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
