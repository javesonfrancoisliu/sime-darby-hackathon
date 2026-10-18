import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { HelpRequest } from "@sdh/contracts";
import { CATEGORY_TEXT } from "../requests/categories";
import { formatWhen, minutesLabel } from "../requests/schedule";
import { useAnnounce } from "../ui/Announcer";
import { Button } from "../ui/Button";
import { IconCheck, IconHome, IconList } from "../ui/Icons";

// Request Confirmation - Apple Success Screen for Silver Generation.
// Features:
// - Clear visual completion feedback (§16 Feedback)
// - Inset receipt card with high-contrast text (§12, §15)
// - Confirm a submitted request, echoing category and description.
export function ConfirmationPage() {
  const navigate = useNavigate();
  const request = (useLocation().state as { request?: HelpRequest } | null)?.request;
  const announce = useAnnounce();
  const sent = Boolean(request);
  useEffect(() => {
    if (sent) announce("Your request was sent.");
  }, [sent, announce]);
  if (!request) return <Navigate to="/requests" replace />;

  return (
    <div className="apple-subpage apple-confirmation-page">
      <div className="apple-success-badge" aria-hidden="true">
        <IconCheck size={36} strokeWidth={2.4} />
      </div>

      <h1 className="ui-page-title" style={{ textAlign: "center", marginTop: 12 }}>
        Request sent
      </h1>
      <p
        className="ui-page-subtitle app-page-lead"
        style={{ textAlign: "center", marginBottom: 24 }}
      >
        We will check it and then find a volunteer to help you.
      </p>

      <div className="apple-inset-group" style={{ marginBottom: 28 }}>
        <div className="apple-inset-row">
          <span className="app-detail-label">Help with</span>
          <span className="apple-inset-value text-strong">
            {CATEGORY_TEXT[request.category]}
          </span>
        </div>
        <div className="apple-inset-row">
          <span className="app-detail-label">When</span>
          <span className="apple-inset-value">
            {formatWhen(request.scheduledAt)}, {minutesLabel(request.durationMinutes)}
          </span>
        </div>
        <div className="apple-inset-row">
          <span className="app-detail-label">Where</span>
          <span className="apple-inset-value">At your home in {request.location.area}</span>
        </div>
      </div>

      <div className="ui-stack" style={{ gap: 12 }}>
        <Button block onClick={() => navigate("/requests")}>
          <IconList className="icon-gap" size={18} strokeWidth={2} aria-hidden="true" />
          View my requests
        </Button>
        <Button block variant="secondary" onClick={() => navigate("/")}>
          <IconHome className="icon-gap" size={18} strokeWidth={2} aria-hidden="true" />
          Back to home
        </Button>
      </div>
    </div>
  );
}
