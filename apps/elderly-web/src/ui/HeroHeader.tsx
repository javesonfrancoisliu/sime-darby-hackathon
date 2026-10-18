import { useAccessibility } from "../context/AccessibilityContext";
import { IconMapPin, IconVolume2, IconVolumeX } from "./Icons";

interface HeroHeaderProps {
  name: string;
  location?: string;
  timeOfDay?: string;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Red hero card at the top of the home screen.
 * Incorporates Apple design optical typography and quick-accessibility controls:
 * - Aa button opens the Silver Generation Accessibility Sheet
 * - Speaker button reads aloud current screen summary for visually impaired elders
 */
export function HeroHeader({
  name,
  location = "Elmina West",
}: HeroHeaderProps) {
  const { openSheet, isSpeaking, speak, stopSpeaking } = useAccessibility();
  const greeting = `${getTimeOfDay()}, ${name}`;

  function handleReadAloud() {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(
        `${greeting}. You are in ${location}. A verified neighbour can help with groceries, rides, phones, household fixes and more. Choose Request help to ask for a hand.`,
      );
    }
  }

  return (
    <div className="app-hero">
      {/* App icon + wordmark at the very top */}
      <div className="app-hero__brand">
        <img
          className="app-hero__brand-icon"
          src="/icons/pwa-192.png"
          alt=""
          width={40}
          height={40}
        />
        <span className="app-hero__brand-name">Help a Neighbour</span>
      </div>

      {/* Location chip with outline pin icon */}
      <div className="app-hero__location">
        <IconMapPin size={14} strokeWidth={2.2} className="app-hero__location-icon" />
        <span>{location.toUpperCase()}</span>
      </div>

      {/* Greeting row */}
      <div className="app-hero__greeting-row">
        <div>
          <p className="app-hero__greeting">{getTimeOfDay()},</p>
          <h1 className="app-hero__name">{name}</h1>
        </div>

        
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
            aria-label="Open text and sound settings"
            title="Text and sound settings"
          >
            Aa
          </button>
        </div>
      </div>
    </div>
  );
}
