import { useNavigate } from "react-router-dom";
import { IconChevronLeft } from "./Icons";

interface BackLinkProps {
  label?: string;
  // Replaces going to the previous page, for example to go back one step.
  onBack?: () => void;
}

// Back button for sub-pages.
// Features:
// - Instant pointer-down response
// - Minimum 44px touch target
// - Standardized monochrome outline chevron icon
// - Accessible name preserved for unit tests (/back/i)
export function BackLink({ label = "Back", onBack }: BackLinkProps) {
  const navigate = useNavigate();

  return (
    <div className="apple-nav-bar">
      <button
        type="button"
        className="ui-button ui-button--ghost apple-back-btn"
        onClick={() => (onBack ? onBack() : navigate(-1))}
        aria-label={`Go ${label}`}
      >
        <IconChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
        <span>{label}</span>
      </button>
    </div>
  );
}
