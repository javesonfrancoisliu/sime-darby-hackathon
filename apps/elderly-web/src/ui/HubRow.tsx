import type { ReactNode } from "react";
import { IconChevronRight } from "./Icons";

// Row icon size, the same as the volunteer app Profile rows.
export const HUB_ICON_SIZE = 22;

interface HubRowProps {
  icon: ReactNode;
  title: string;
  // One line that shows the live state behind the row.
  summary: string;
  onClick: () => void;
}

// Large tappable row for the Profile hub: icon, title, one-line summary and a chevron.
export function HubRow({ icon, title, summary, onClick }: HubRowProps) {
  return (
    <button type="button" className="apple-inset-btn-row no-underline" onClick={onClick}>
      <div className="apple-inset-btn-row__left">
        <span className="apple-inset-btn-row__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <span className="apple-inset-btn-row__title">{title}</span>
          <span className="apple-inset-btn-row__subtitle">{summary}</span>
        </div>
      </div>
      <span className="apple-card-button__arrow" aria-hidden="true">
        <IconChevronRight size={18} strokeWidth={2} />
      </span>
    </button>
  );
}
