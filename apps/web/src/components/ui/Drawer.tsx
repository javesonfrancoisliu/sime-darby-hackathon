import { useId, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface DrawerProps {
  /** Whether the drawer body is currently expanded. */
  open: boolean;
  /** Toggle handler (a button laid over the whole header row). */
  onToggle: () => void;
  /** Always-visible header content (title row, chips, progress, etc.). */
  header: ReactNode;
  /** Collapsible body content, revealed when open. */
  children: ReactNode;
  /** Extra class on the outer card. */
  className?: string;
  /** Optional accessible label applied to the outer card (e.g. "Facility report: ..."). */
  ariaLabel?: string;
}

/**
 * Drawer — a tap-to-expand card. The header row is the control; the body
 * animates open/closed beneath it. The toggle is a button laid over the header content, not a
 * wrapper around it, so a heading in the header stays a heading, and the button is named by
 * everything the header shows (title, status, place, date) with aria-expanded giving the state.
 *
 * Ported from the elderly app without its useAccessibility/haptics deps:
 *  - The body collapses with a `grid-template-rows: 0fr → 1fr` transition, so
 *    it animates to the content's real height with no magic max-height. A
 *    single critically-damped curve (cubic-bezier(0.22,1,0.36,1), ~340ms) gives
 *    a calm, non-bouncy settle.
 *  - The chevron rotates to point down when open, hinting the direction of the
 *    reveal, and shares the same curve so motion stays harmonious.
 *  - The toggle is a real <button> and reduced motion collapses instantly via
 *    CSS.
 */
export function Drawer({ open, onToggle, header, children, className, ariaLabel }: DrawerProps) {
  const bodyId = useId();
  const contentId = useId();
  return (
    <div
      className={`drawer${open ? " drawer--open" : ""}${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      <div className="drawer__header">
        <span className="drawer__header-content" id={contentId}>
          {header}
        </span>
        <span className="drawer__chevron" aria-hidden="true">
          <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
        </span>
        <button
          type="button"
          className="drawer__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-labelledby={contentId}
          onClick={onToggle}
        />
      </div>

      {/* Kept in the layout (not display:none) so the grid-row collapse can
          animate to the content's real height. When closed it is inert, so its
          controls can't be tabbed to or read out. */}
      <div
        id={bodyId}
        className="drawer__body"
        role="region"
        aria-labelledby={contentId}
        inert={!open}
      >
        <div className="drawer__body-inner">
          <div className="drawer__content">{children}</div>
        </div>
      </div>
    </div>
  );
}
