import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAccessibility } from "../context/AccessibilityContext";
import { useCancelRequest, useConfirmRequest, useRequest } from "../hooks/useRequests";
import { CATEGORY_TEXT } from "../requests/categories";
import { formatWhen, minutesLabel } from "../requests/schedule";
import { useAnnounce } from "../ui/Announcer";
import { canCancel, showsVolunteer } from "../ui/status";
import { BackLink } from "../ui/BackLink";
import { Button } from "../ui/Button";
import { Banner } from "../ui/Banner";
import { EmergencyCallButton } from "../ui/EmergencyCallButton";
import { Spinner } from "../ui/Spinner";
import { StatusBadge } from "../ui/StatusBadge";
import { IconCheck, IconUser } from "../ui/Icons";

// Plain words for the volunteer row before anyone has taken the request.
function noVolunteerText(status: string): string {
  return status === "cancelled" || status === "rejected" ? "No volunteer" : "Not matched yet";
}

// Request detail: grouped rows for status, time, place and volunteer.
// Refreshes while open so a volunteer accepting shows up without a reload.
export function RequestDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, status, error, refetch, update } = useRequest(id);
  const cancelMutation = useCancelRequest();
  const confirmMutation = useConfirmRequest();
  const [confirming, setConfirming] = useState(false);
  const announce = useAnnounce();
  const { speak } = useAccessibility();
  const confirmRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Keyboard and screen reader focus follows the button into the confirmation card.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  if (status === "loading" && !data) {
    return (
      <div className="apple-subpage">
        <BackLink />
        <Spinner label="Loading request" />
      </div>
    );
  }

  // An unknown id is NOT_FOUND; an id the server cannot read is a 400.
  if (error?.code === "NOT_FOUND" || error?.code === "VALIDATION_FAILED") {
    return (
      <div className="apple-subpage">
        <BackLink label="Back to my requests" onBack={() => navigate("/requests")} />
        <Banner message="We could not find this request." />
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
    if (updated) {
      update(() => updated);
      announce("Your request was cancelled.");
    }
    setConfirming(false);
    titleRef.current?.focus();
  }

  async function onConfirmHelped() {
    const updated = await confirmMutation.run(req.id);
    if (updated) {
      update(() => updated);
      announce("Thank you. You confirmed your volunteer came.");
    }
  }

  const alreadyConfirmed = confirmMutation.error?.code === "ALREADY_DONE";

  const readAloud = () =>
    speak(`${req.title}. ${CATEGORY_TEXT[req.category]}. ${formatWhen(req.scheduledAt)}.`);

  return (
    <div className="apple-subpage">
      <BackLink onReadAloud={readAloud} />

      <div className="apple-detail-hero">
        <h1 ref={titleRef} tabIndex={-1} className="ui-page-title mb-1">
          {req.title}
        </h1>
        <div>
          <span className="apple-meta-pill">{CATEGORY_TEXT[req.category]}</span>
        </div>
      </div>

      <div className="apple-inset-group">
        <div className="apple-inset-row">
          <span className="app-detail-label">Status</span>
          <StatusBadge
            status={req.status}
            confirmedAt={req.confirmedAt ?? (alreadyConfirmed ? "confirmed" : undefined)}
          />
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
            <span className="apple-inset-value apple-inset-value--wrap text-multiline">
              {req.description}
            </span>
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
          {req.volunteerName || showsVolunteer(req.status) ? (
            <div className="apple-volunteer-chip">
              <span className="apple-volunteer-chip__avatar" aria-hidden="true">
                <IconUser size={14} strokeWidth={2} />
              </span>
              <span className="apple-volunteer-chip__name">{req.volunteerName ?? "Assigned"}</span>
            </div>
          ) : (
            <span className="apple-inset-value text-secondary">{noVolunteerText(req.status)}</span>
          )}
        </div>
      </div>

      {req.status === "completed" ? (
        req.confirmedAt || alreadyConfirmed ? (
          <div className="apple-confirm-card apple-confirm-card--success" role="status">
            <p className="apple-confirm-card__title">
              <IconCheck size={20} strokeWidth={2.5} aria-hidden="true" />
              Thank you, you confirmed
            </p>
            <p className="apple-confirm-card__sub">We are glad your volunteer could help.</p>
          </div>
        ) : (
          <div className="apple-confirm-card">
            <p className="apple-confirm-card__title">Did your volunteer come?</p>
            <p className="apple-confirm-card__sub">
              Please tell us so we can thank them for helping you.
            </p>
            {confirmMutation.status === "error" ? (
              <Banner
                message={
                  confirmMutation.error?.message ?? "We could not save that. Please try again."
                }
              />
            ) : null}
            <div className="mt-4">
              <Button
                block
                onClick={() => void onConfirmHelped()}
                disabled={confirmMutation.status === "loading"}
              >
                {confirmMutation.status === "loading" ? "Saving…" : "Yes, they helped me"}
              </Button>
            </div>
          </div>
        )
      ) : null}

      <div className="request-detail__call">
        <EmergencyCallButton compact />
      </div>

      {cancelMutation.status === "error" ? (
        <Banner message={cancelMutation.error?.message ?? "We could not cancel this request."} />
      ) : null}

      {canCancel(req.status) ? (
        confirming ? (
          <div ref={confirmRef} tabIndex={-1} className="apple-confirm-card">
            <p className="apple-confirm-card__title">
              Are you sure you want to cancel this request?
            </p>
            <p className="apple-confirm-card__sub">
              {req.status === "matched"
                ? "Your volunteer will be told and this request will be closed."
                : "This request will be closed."}
            </p>
            <div className="ui-stack stack-gap-3 mt-4">
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
          <div className="mt-8">
            <Button block variant="danger" onClick={() => setConfirming(true)}>
              Cancel request
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
