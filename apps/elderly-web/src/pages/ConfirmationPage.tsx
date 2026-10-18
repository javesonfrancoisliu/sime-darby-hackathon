import { useLocation, useNavigate } from "react-router-dom";
import type { HelpCategory } from "../api/client";
import { CATEGORY_TEXT } from "../ui/status";
import { Button } from "../ui/Button";
import { IconCheck, IconHome, IconList } from "../ui/Icons";

interface ConfirmationState {
  category?: HelpCategory;
  description?: string;
}

/**
 * Request Confirmation — Apple Success Screen for Silver Generation.
 * Features:
 * - Clear visual completion feedback (§16 Feedback)
 * - Inset receipt card with high-contrast text (§12, §15)
 * - Confirm a submitted request, echoing category and description (Req 5.4).
 */
export function ConfirmationPage() {
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as ConfirmationState;

  return (
    <div className="apple-subpage apple-confirmation-page">
      {/* ── Apple Success Medallion ───────────────────────────── */}
      <div className="apple-success-badge" aria-hidden="true">
        <IconCheck size={36} strokeWidth={2.4} />
      </div>

      <h1 className="ui-page-title" style={{ textAlign: "center", marginTop: 12 }}>
        Request sent
      </h1>
      <p className="ui-page-subtitle app-page-lead" style={{ textAlign: "center", marginBottom: 24 }}>
        A volunteer will be matched to help you soon.
      </p>

      {/* ── Inset Receipt Card ───────────────────────────────── */}
      <div className="apple-inset-group" style={{ marginBottom: 28 }}>
        {state.category ? (
          <div className="apple-inset-row">
            <span className="app-detail-label">Category</span>
            <span className="apple-inset-value" style={{ fontWeight: 700 }}>
              {CATEGORY_TEXT[state.category]}
            </span>
          </div>
        ) : null}

        {state.description ? (
          <div className="apple-inset-row">
            <span className="app-detail-label">Your description</span>
            <span className="apple-inset-value">{state.description}</span>
          </div>
        ) : null}
      </div>

      {/* ── Action Buttons ───────────────────────────────────── */}
      <div className="ui-stack" style={{ gap: 12 }}>
        <Button block onClick={() => navigate("/requests")}>
          <IconList size={18} strokeWidth={2} aria-hidden="true" style={{ marginRight: 6 }} />
          View my requests
        </Button>
        <Button block variant="secondary" onClick={() => navigate("/")}>
          <IconHome size={18} strokeWidth={2} aria-hidden="true" style={{ marginRight: 6 }} />
          Back to home
        </Button>
      </div>
    </div>
  );
}
