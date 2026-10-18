import { IconShieldCheck } from "./Icons";

interface RequestCardProps {
  title: string;
  date: string;
  volunteerName?: string;
  /** "Volunteer coming" | "Finding a volunteer" | etc. */
  statusLabel: string;
  statusVariant: "success" | "warning" | "info";
  onClick?: () => void;
}

const VARIANT_CLASSES: Record<RequestCardProps["statusVariant"], string> = {
  success: "app-request-card__badge--success",
  warning: "app-request-card__badge--warning",
  info: "app-request-card__badge--info",
};

/**
 * Request summary card matching the design's "My requests" list items.
 * Shows a status chip, title, date and verified volunteer badge.
 */
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
          <span className="app-request-card__verified" aria-label="Verified volunteer">
            <IconShieldCheck size={16} strokeWidth={2} />
          </span>
        </div>
      )}
    </button>
  );
}
