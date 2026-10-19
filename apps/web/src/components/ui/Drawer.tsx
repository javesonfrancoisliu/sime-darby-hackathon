import { useId, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface DrawerProps {
  /** Whether the drawer body is currently expanded. */
  open: boolean;
  /** Toggle handler (the whole header row is the button). */
  onToggle: () => void;
  /** Always-visible header content (title row, chips, progress, etc.). */
  header: ReactNode;
  /** Collapsible body content, revealed when open. */
  children: ReactNode;
  /** Accessible label for the toggle (e.g. the card title). */
  label: string;
  /** Extra class on the outer card. */
  className?: string;
  /** Optional accessible label applied to the outer card (e.g. "Facility report: ..."). */
  ariaLabel?: string;
}

/**
 * Drawer — a tap-to-expand card. The header row is the control; the body
 * animates open/closed beneath it.
 *
 * Ported from the elderly app without its useAccessibility/haptics deps:
 *  - The body collapses with a `grid-template-rows: 0fr → 1fr` transition, so
 *    it animates to the content's real height with no magic max-height. A
 *    single critically-damped curve (cubic-bezier(0.22,1,0.36,1), ~340ms) gives
 *    a calm, non-bouncy settle.
 *  - The chevron rotates to point down when open, hinting the direction of the
 *    reveal, and shares the same curve so motion stays harmonious.
 *  - The header is a real <button> and reduced motion collapses instantly via
 *    CSS.
 */
export function Drawer({
  open,
  onToggle,
  header,
  children,
  label,
  className,
  ariaLabel,
}: DrawerProps) {
  const bodyId = useId();
  return (
    <div
      className={`drawer${open ? " drawer--open" : ""}${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="drawer__header"
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={`${label}. ${open ? "Hide details" : "Show details"}`}
        onClick={onToggle}
      >
        <span className="drawer__header-content">{header}</span>
        <span className="drawer__chevron" aria-hidden="true">
          <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
        </span>
      </button>

      {/* Kept in the layout (not display:none) so the grid-row collapse can
          animate to the content's real height. When closed it is inert, so its
          controls can't be tabbed to or read out. */}
      <div
        id={bodyId}
        className="drawer__body"
        role="region"
        {...(open ? {} : ({ inert: "" } as object))}
      >
        <div className="drawer__body-inner">
          <div className="drawer__content">{children}</div>
        </div>
      </div>
    </div>
  );
}
