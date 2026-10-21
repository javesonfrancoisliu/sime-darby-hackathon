import { ChevronRight } from "lucide-react";
import type { MouseEvent, ReactNode, Ref } from "react";

export type HubRowProps = {
  icon: ReactNode;
  title: string;
  // One line that shows the live state behind the row.
  summary: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  // The row button, for a caller that must return focus to it without a click.
  buttonRef?: Ref<HTMLButtonElement>;
};

// Large tappable row for a hub screen: icon, title, one-line summary and a chevron.
export function HubRow({ icon, title, summary, onClick, buttonRef }: HubRowProps) {
  return (
    <button type="button" className="ui-hub-row" onClick={onClick} ref={buttonRef}>
      <span className="ui-hub-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="ui-hub-row__text">
        <span className="ui-hub-row__title">{title}</span>
        <span className="ui-hub-row__summary">{summary}</span>
      </span>
      <ChevronRight className="ui-hub-row__chevron" size={20} aria-hidden="true" />
    </button>
  );
}
