import { isSlotPast, TIME_SLOTS, type DayChoice, type TimeSlot } from "../../requests/schedule";
import { Button } from "../../ui/Button";
import { ChoiceButton } from "../../ui/ChoiceButton";

interface WhenStepProps {
  day: DayChoice | null;
  slot: TimeSlot | null;
  now: Date;
  onDay: (day: DayChoice) => void;
  onSlot: (slot: TimeSlot) => void;
  onNext: () => void;
}

export function WhenStep({ day, slot, now, onDay, onSlot, onNext }: WhenStepProps) {
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

      <div className="step-actions">
        <Button block disabled={!day || !slot} onClick={onNext}>
          Next
        </Button>
      </div>
    </>
  );
}
