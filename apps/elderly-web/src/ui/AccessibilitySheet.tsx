import { useSession } from "@sdh/api-client";
import { meApi } from "../api/me";
import { useMutation } from "../hooks/useMutation";
import { FONT_LABEL, useAccessibility, type FontSizeLevel } from "../context/AccessibilityContext";
import { Banner } from "./Banner";
import { IconBell, IconSun, IconTrophy, IconVolume2, IconVolumeX } from "./Icons";
import { Sheet } from "./Sheet";

// Settings sheet: the shared Sheet holding text size, contrast, read aloud, less movement, reminders and rankings.
export function AccessibilitySheet() {
  const { isSheetOpen, closeSheet } = useAccessibility();
  return (
    <Sheet
      open={isSheetOpen}
      onClose={closeSheet}
      title="Settings"
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
    reminders,
    setReminders,
  } = useAccessibility();
  const { user, updateUser } = useSession();
  const saveRanking = useMutation(meApi.update);

  async function handleRankingToggle() {
    if (!user) return;
    triggerHaptic(15);
    const saved = await saveRanking.run({ leaderboardOptIn: !user.leaderboardOptIn });
    if (saved) updateUser(saved);
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
              {voiceAssist ? (
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

        <div className="apple-control-row">
          <div className="apple-control-row__left">
            <span className="apple-control-row__icon" aria-hidden="true">
              <IconBell size={22} strokeWidth={1.8} />
            </span>
            <div>
              <span className="apple-control-row__title">Reminders</span>
              <span className="apple-control-row__desc">Events and volunteering nearby</span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reminders}
            aria-label="Reminders"
            className={`apple-switch${reminders ? " apple-switch--on" : ""}`}
            onClick={() => {
              triggerHaptic(15);
              setReminders(!reminders);
            }}
          >
            <span className="apple-switch__thumb" />
          </button>
        </div>

        {user ? (
          <div className="apple-control-row">
            <div className="apple-control-row__left">
              <span className="apple-control-row__icon" aria-hidden="true">
                <IconTrophy size={22} strokeWidth={1.8} />
              </span>
              <div>
                <span className="apple-control-row__title">Show me in Rankings</span>
                <span className="apple-control-row__desc">
                  Neighbours can see your name and points
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={user.leaderboardOptIn}
              aria-label="Show me in Rankings"
              className={`apple-switch${user.leaderboardOptIn ? " apple-switch--on" : ""}`}
              disabled={saveRanking.status === "loading"}
              onClick={() => void handleRankingToggle()}
            >
              <span className="apple-switch__thumb" />
            </button>
          </div>
        ) : null}
        {saveRanking.status === "error" ? (
          <Banner message={saveRanking.error?.message ?? "We could not save that."} />
        ) : null}
      </div>
    </>
  );
}
