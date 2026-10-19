import type { BadgeTone } from "./status";
import { LevelBadge } from "./LevelBadge";
import type { VolunteerLevelNumber } from "./volunteerLevels";

interface RequestCardProps {
  title: string;
  date: string;
  volunteerName?: string;
  statusLabel: string;
  statusVariant: BadgeTone;
  onClick?: () => void;
}

const VARIANT_CLASSES: Record<RequestCardProps["statusVariant"], string> = {
  success: "app-request-card__badge--success",
  warning: "app-request-card__badge--warning",
  info: "app-request-card__badge--info",
  danger: "app-request-card__badge--danger",
};

// A stable demo level (1–4) from the volunteer's name, matching the request
// detail page so the same volunteer always shows the same level.
function volunteerLevel(name: string): VolunteerLevelNumber {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return ((sum % 4) + 1) as VolunteerLevelNumber;
}

// Request summary card matching the design's "My requests" list items.
// Shows a status chip, title, date and the matched volunteer with their level.
export function RequestCard({
  title,
  date,
  volunteerName,
  statusLabel,
  statusVariant,
  onClick,
}: RequestCardProps) {
  return (
    <button type="button" className="app-request-card" onClick={onClick}>
      <span className={`app-request-card__badge ${VARIANT_CLASSES[statusVariant]}`}>
        {statusLabel}
      </span>
      <h3 className="app-request-card__title">{title}</h3>
      <p className="app-request-card__date">{date}</p>
      {volunteerName && (
        <div className="app-request-card__volunteer">
          <span className="app-request-card__avatar" aria-hidden="true">
            {volunteerName.charAt(0).toUpperCase()}
          </span>
          <span>{volunteerName}</span>
          <span className="app-request-card__level">
            <LevelBadge level={volunteerLevel(volunteerName)} />
          </span>
        </div>
      )}
    </button>
  );
}
