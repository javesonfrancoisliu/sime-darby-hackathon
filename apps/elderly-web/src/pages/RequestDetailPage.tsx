import { useState } from "react";
import { useParams } from "react-router-dom";
import type { HelpRequest } from "../api/client";
import { useCancelHelpRequest, useHelpRequest } from "../hooks/useHelpRequests";
import { CATEGORY_TEXT, canCancel, showsVolunteer } from "../ui/status";
import { BackLink } from "../ui/BackLink";
import { Button } from "../ui/Button";
import { Banner } from "../ui/Banner";
import { Spinner } from "../ui/Spinner";
import { StatusBadge } from "../ui/StatusBadge";
import { IconShieldCheck, IconUser } from "../ui/Icons";

/**
 * Request Detail — Apple Inset-Grouped Inspector layout.
 * Follows Apple HIG for inspection & destruction:
 * - Grouped metadata tiles (§12)
 * - Clear volunteer identity card (§16)
 * - Forgiving destructive confirmation flow (§16 Agency)
 * - Request detail with volunteer display (Req 7) and cancel flow (Req 8).
 */
export function RequestDetailPage() {
  const { id = "" } = useParams();
  const { data, status, error, refetch } = useHelpRequest(id);
  const cancelMutation = useCancelHelpRequest();
  const [local, setLocal] = useState<HelpRequest>();
  const [confirming, setConfirming] = useState(false);

  if (status === "loading") {
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
        <Banner
          message={error?.message ?? "We could not load this request."}
          onRetry={refetch}
        />
      </div>
    );
  }

  const req = local ?? data;

  async function onConfirmCancel() {
    try {
      const updated = await cancelMutation.cancel(req.id);
      setLocal(updated); // reflect cancelled status (Req 8.3)
      setConfirming(false);
    } catch {
      // prior status retained; error shown below (Req 8.4)
      setConfirming(false);
    }
  }

  return (
    <div className="apple-subpage">
      <BackLink />

      <div className="apple-detail-hero">
        <h1 className="ui-page-title" style={{ marginBottom: 4 }}>
          {CATEGORY_TEXT[req.category]}
        </h1>
        <div>
          <span className="apple-meta-pill">Request #{req.id}</span>
        </div>
      </div>

      {/* ── Grouped Detail Container (Apple Inset Style) ─────── */}
      <div className="apple-inset-group">
        <div className="apple-inset-row">
          <span className="app-detail-label">Status</span>
          <StatusBadge status={req.status} />
        </div>

        <div className="apple-inset-row">
          <span className="app-detail-label">Your description</span>
          <span className="apple-inset-value">{req.description}</span>
        </div>

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
              Waiting to be matched
            </span>
          )}
        </div>
      </div>

      {cancelMutation.status === "error" ? (
        <Banner
          message={cancelMutation.error?.message ?? "We could not cancel this request."}
        />
      ) : null}

      {/* ── Cancel Request Flow (Apple destructive design) ─────── */}
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
