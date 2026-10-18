import { DURATION_OPTIONS, minutesLabel } from "../../requests/schedule";
import { Button } from "../../ui/Button";
import { ChoiceButton } from "../../ui/ChoiceButton";

interface LengthStepProps {
  minutes: number | null;
  onPick: (minutes: number) => void;
  onNext: () => void;
}

export function LengthStep({ minutes, onPick, onNext }: LengthStepProps) {
  return (
    <>
      <div className="choice-grid" role="group" aria-label="How long?">
        {DURATION_OPTIONS.map((option) => (
          <ChoiceButton key={option} selected={minutes === option} onClick={() => onPick(option)}>
            {minutesLabel(option)}
          </ChoiceButton>
        ))}
      </div>
      <div className="step-actions">
        <Button block disabled={minutes === null} onClick={onNext}>
          Next
        </Button>
      </div>
    </>
  );
}
