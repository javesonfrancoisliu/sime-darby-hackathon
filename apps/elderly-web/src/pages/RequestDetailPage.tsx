import { useState } from "react";
import { useParams } from "react-router-dom";
import { useCancelRequest, useRequest } from "../hooks/useRequests";
import { CATEGORY_TEXT } from "../requests/categories";
import { formatWhen, minutesLabel } from "../requests/schedule";
import { canCancel, showsVolunteer } from "../ui/status";
import { BackLink } from "../ui/BackLink";
import { Button } from "../ui/Button";
import { Banner } from "../ui/Banner";
import { Spinner } from "../ui/Spinner";
import { StatusBadge } from "../ui/StatusBadge";
import { IconShieldCheck, IconUser } from "../ui/Icons";

// Plain words for the volunteer row before anyone has taken the request.
function noVolunteerText(status: string): string {
  return status === "cancelled" || status === "rejected" ? "No volunteer" : "Not matched yet";
}

// Request Detail - Apple Inset-Grouped Inspector layout.
// Refreshes while open so a volunteer accepting shows up without a reload.
export function RequestDetailPage() {
  const { id = "" } = useParams();
  const { data, status, error, refetch, update } = useRequest(id);
  const cancelMutation = useCancelRequest();
  const [confirming, setConfirming] = useState(false);

  if (status === "loading" && !data) {
    return (
      <div className="apple-subpage">
        <BackLink />
        <Spinner label="Loading request" />
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="apple-subpage">
        <BackLink />
        <Banner message={error?.message ?? "We could not load this request."} onRetry={refetch} />
      </div>
    );
  }

  const req = data;

  async function onConfirmCancel() {
    const updated = await cancelMutation.run(req.id);
    if (updated) update(() => updated);
    setConfirming(false);
  }

  return (
    <div className="apple-subpage">
      <BackLink />

      <div className="apple-detail-hero">
        <h1 className="ui-page-title" style={{ marginBottom: 4 }}>
          {req.title}
        </h1>
        <div>
          <span className="apple-meta-pill">{CATEGORY_TEXT[req.category]}</span>
        </div>
      </div>

      <div className="apple-inset-group">
        <div className="apple-inset-row">
          <span className="app-detail-label">Status</span>
          <StatusBadge status={req.status} />
        </div>

        <div className="apple-inset-row">
          <span className="app-detail-label">When</span>
          <span className="apple-inset-value">
            {formatWhen(req.scheduledAt)}, {minutesLabel(req.durationMinutes)}
          </span>
        </div>

        <div className="apple-inset-row">
          <span className="app-detail-label">Where</span>
          <span className="apple-inset-value">At your home in {req.location.area}</span>
        </div>

        {req.description ? (
          <div className="apple-inset-row">
            <span className="app-detail-label">Your description</span>
            <span className="apple-inset-value">{req.description}</span>
          </div>
        ) : null}

        {req.status === "rejected" && req.reviewNote ? (
          <div className="apple-inset-row">
            <span className="app-detail-label">Note from our team</span>
            <span className="apple-inset-value">{req.reviewNote}</span>
          </div>
        ) : null}

        <div className="apple-inset-row">
          <span className="app-detail-label">Volunteer</span>
          {showsVolunteer(req.status) ? (
            <div className="apple-volunteer-chip">
              <span className="apple-volunteer-chip__avatar" aria-hidden="true">
                <IconUser size={14} strokeWidth={2} />
              </span>
              <span>{req.volunteerName ?? "Assigned"}</span>
              <span className="apple-volunteer-chip__badge" aria-label="Verified">
                <IconShieldCheck size={14} strokeWidth={2.2} />
              </span>
            </div>
          ) : (
            <span className="apple-inset-value" style={{ color: "var(--text-secondary)" }}>
              {noVolunteerText(req.status)}
            </span>
          )}
        </div>
      </div>

      {cancelMutation.status === "error" ? (
        <Banner message={cancelMutation.error?.message ?? "We could not cancel this request."} />
      ) : null}

      {canCancel(req.status) ? (
        confirming ? (
          <div className="apple-confirm-card">
            <p className="apple-confirm-card__title">
              Are you sure you want to cancel this request?
            </p>
            <p className="apple-confirm-card__sub">
              Your neighbour volunteer will be notified and this request will be closed.
            </p>
            <div className="ui-stack" style={{ gap: 10, marginTop: 16 }}>
              <Button
                block
                variant="danger"
                onClick={onConfirmCancel}
                disabled={cancelMutation.status === "loading"}
              >
                {cancelMutation.status === "loading" ? "Cancelling…" : "Yes, cancel request"}
              </Button>
              <Button block variant="secondary" onClick={() => setConfirming(false)}>
                Keep request
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 28 }}>
            <Button block variant="danger" onClick={() => setConfirming(true)}>
              Cancel request
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
