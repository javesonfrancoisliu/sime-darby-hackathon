import {
  DURATION_OPTIONS,
  isSlotPast,
  minutesLabel,
  TIME_SLOTS,
  type DayChoice,
  type TimeSlot,
} from "../../requests/schedule";
import { Button } from "../../ui/Button";
import { ChoiceButton } from "../../ui/ChoiceButton";

interface WhenStepProps {
  day: DayChoice | null;
  slot: TimeSlot | null;
  minutes: number | null;
  now: Date;
  onDay: (day: DayChoice) => void;
  onSlot: (slot: TimeSlot) => void;
  onMinutes: (minutes: number) => void;
  onNext: () => void;
}

export function WhenStep({
  day,
  slot,
  minutes,
  now,
  onDay,
  onSlot,
  onMinutes,
  onNext,
}: WhenStepProps) {
  const noneLeftToday = day === "today" && TIME_SLOTS.every((s) => isSlotPast("today", s, now));

  return (
    <>
      <p className="step-question">Which day?</p>
      <div className="choice-grid" role="group" aria-label="Which day?">
        <ChoiceButton selected={day === "today"} onClick={() => onDay("today")}>
          Today
        </ChoiceButton>
        <ChoiceButton selected={day === "tomorrow"} onClick={() => onDay("tomorrow")}>
          Tomorrow
        </ChoiceButton>
      </div>

      {day ? (
        <>
          <p className="step-question">What time?</p>
          <div className="choice-list" role="group" aria-label="What time?">
            {TIME_SLOTS.map((option) => (
              <ChoiceButton
                key={option.id}
                selected={slot?.id === option.id}
                disabled={isSlotPast(day, option, now)}
                onClick={() => onSlot(option)}
                hint={option.clock}
              >
                {option.label}
              </ChoiceButton>
            ))}
          </div>
          {noneLeftToday ? (
            <p className="ui-helper" role="status">
              There are no more times today. Please choose Tomorrow.
            </p>
          ) : null}
        </>
      ) : null}

      {slot ? (
        <>
          <p className="step-question">How long?</p>
          <div className="choice-grid" role="group" aria-label="How long?">
            {DURATION_OPTIONS.map((option) => (
              <ChoiceButton
                key={option}
                selected={minutes === option}
                onClick={() => onMinutes(option)}
              >
                {minutesLabel(option)}
              </ChoiceButton>
            ))}
          </div>
        </>
      ) : null}

      <div className="step-actions">
        <Button block disabled={!day || !slot || minutes === null} onClick={onNext}>
          Next
        </Button>
      </div>
    </>
  );
}
