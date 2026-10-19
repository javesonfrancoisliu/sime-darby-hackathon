import { useAccessibility } from "../context/AccessibilityContext";
import { IconVolume2, IconVolumeX } from "./Icons";

interface PageHeaderActionsProps {
  /** What to read when the speaker button is pressed (the page summary). */
  onReadAloud: () => void;
}

/**
 * The two quick-accessibility controls used on the home hero, extracted so
 * every page header can show the identical pair:
 *  1. a read-aloud speaker that toggles between play and stop, and
 *  2. the "Aa" button that opens the text-and-sound settings sheet.
 *
 * Styled to sit on the red page headers (same look as the hero actions).
 */
export function PageHeaderActions({ onReadAloud }: PageHeaderActionsProps) {
  const { openSheet, isSpeaking, stopSpeaking } = useAccessibility();

  function handleReadAloud() {
    if (isSpeaking) stopSpeaking();
    else onReadAloud();
  }

  return (
    <div className="app-hero__actions">
      <button
        type="button"
        className={`app-hero__btn-icon${isSpeaking ? " app-hero__btn-icon--active" : ""}`}
        onClick={handleReadAloud}
        aria-label={isSpeaking ? "Stop reading aloud" : "Read page aloud"}
        title="Read screen aloud"
      >
        {isSpeaking ? (
          <IconVolumeX size={18} strokeWidth={2.2} />
        ) : (
          <IconVolume2 size={18} strokeWidth={2} />
        )}
      </button>

      <button
        type="button"
        className="app-hero__aa-btn"
        onClick={openSheet}
        aria-label="Text and sound settings"
        title="Text and sound settings"
      >
        Aa
      </button>
    </div>
  );
}
