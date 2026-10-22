import { useId, type ReactNode } from "react";
import { IconChevronRight } from "./Icons";

interface DrawerProps {
  /** Whether the drawer body is currently expanded. */
  open: boolean;
  /** Toggle handler (the whole header row is the button). */
  onToggle: () => void;
  /** Always-visible header content (title row, chips, progress, etc.). */
  header: ReactNode;
  /** Collapsible body content, revealed when open. */
  children: ReactNode;
  /** Extra class on the outer card. */
  className?: string;
}

/**
 * Drawer — a tap-to-expand card. The header row is the control; the body
 * animates open/closed beneath it.
 *
 * The toggle is named by what its header shows (title, status, place, date), and aria-expanded says
 * whether it is open; the body region takes the same name.
 *
 * apple-design notes:
 *  - The body collapses with a `grid-template-rows: 0fr → 1fr` transition, so
 *    it animates to the content's real height with no magic max-height (§4,
 *    behaviour over fixed animation). A single critically-damped curve
 *    (cubic-bezier(0.22,1,0.36,1), ~340ms) gives a calm, non-bouncy settle
 *    (§4 defaults: damping ~1.0 for a surface that didn't carry momentum).
 *  - The chevron rotates to point down when open, hinting the direction of the
 *    reveal (§8), and shares the same curve so motion stays harmonious (§13).
 *  - Feedback is on press and the header is a real <button> (§1, §16 agency).
 *  - Reduced motion collapses instantly via CSS (§14).
 */
export function Drawer({ open, onToggle, header, children, className }: DrawerProps) {
  const bodyId = useId();
  const toggleId = useId();
  return (
    <div className={`drawer${open ? " drawer--open" : ""}${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        id={toggleId}
        className="drawer__header"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <span className="drawer__header-content">{header}</span>
        <span className="drawer__chevron" aria-hidden="true">
          <IconChevronRight size={20} strokeWidth={2.4} />
        </span>
      </button>

      {/* Kept in the layout (not display:none) so the grid-row collapse can
          animate to the content's real height. When closed it is inert, so its
          controls can't be tabbed to or read out. */}
      <div
        id={bodyId}
        className="drawer__body"
        role="region"
        aria-labelledby={toggleId}
        {...(open ? {} : ({ inert: "" } as object))}
      >
        <div className="drawer__body-inner">
          <div className="drawer__content">{children}</div>
        </div>
      </div>
    </div>
  );
}
