import {
  formatWhen,
  minutesLabel,
  slotIso,
  type DayChoice,
  type TimeSlot,
} from "../../requests/schedule";
import { Banner } from "../../ui/Banner";
import { Button } from "../../ui/Button";

interface ConfirmStepProps {
  categoryLabel: string;
  description: string;
  day: DayChoice;
  slot: TimeSlot;
  durationMinutes: number;
  area: string;
  now: Date;
  sending: boolean;
  errorMessage: string | undefined;
  onSend: () => void;
}

export function ConfirmStep(props: ConfirmStepProps) {
  const { categoryLabel, description, day, slot, durationMinutes, area, now, sending } = props;
  return (
    <>
      {props.errorMessage ? (
        <Banner message={props.errorMessage} onRetry={sending ? undefined : props.onSend} />
      ) : null}

      <div className="apple-inset-group">
        <div className="apple-inset-row">
          <span className="app-detail-label">Help with</span>
          <span className="apple-inset-value" style={{ fontWeight: 700 }}>
            {categoryLabel}
          </span>
        </div>
        {description.trim() ? (
          <div className="apple-inset-row">
            <span className="app-detail-label">Your note</span>
            <span className="apple-inset-value">{description.trim()}</span>
          </div>
        ) : null}
        <div className="apple-inset-row">
          <span className="app-detail-label">When</span>
          <span className="apple-inset-value">{formatWhen(slotIso(day, slot, now))}</span>
        </div>
        <div className="apple-inset-row">
          <span className="app-detail-label">How long</span>
          <span className="apple-inset-value">{minutesLabel(durationMinutes)}</span>
        </div>
        <div className="apple-inset-row">
          <span className="app-detail-label">Where</span>
          <span className="apple-inset-value">At your home in {area}</span>
        </div>
      </div>

      <div className="step-actions">
        <Button block disabled={sending} onClick={props.onSend}>
          {sending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </>
  );
}
