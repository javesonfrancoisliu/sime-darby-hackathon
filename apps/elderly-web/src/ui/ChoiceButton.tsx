import type { ReactNode } from "react";
import { IconCheck } from "./Icons";

interface ChoiceButtonProps {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  // Second line under the main text, for example a clock time.
  hint?: string;
}

// Large pick-one button. The tick shows the choice, so colour is never the only signal.
export function ChoiceButton({ selected, disabled, onClick, children, hint }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      className={`choice-btn${selected ? " choice-btn--selected" : ""}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="choice-btn__text">
        <span className="choice-btn__label">{children}</span>
        {hint ? <span className="choice-btn__hint">{hint}</span> : null}
      </span>
      {selected ? <IconCheck size={24} strokeWidth={2.6} aria-hidden="true" /> : null}
    </button>
  );
}
