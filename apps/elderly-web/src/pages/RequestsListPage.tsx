import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMyRequests } from "../hooks/useRequests";
import { formatWhen } from "../requests/schedule";
import { useAnnounce } from "../ui/Announcer";
import { BackLink } from "../ui/BackLink";
import { Button } from "../ui/Button";
import { Banner } from "../ui/Banner";
import { Spinner } from "../ui/Spinner";
import { StatusBadge } from "../ui/StatusBadge";
import { IconChevronRight, IconList, IconPlus } from "../ui/Icons";

export function RequestsListPage() {
  const navigate = useNavigate();
  const { data, status, error, refetch } = useMyRequests();
  const announce = useAnnounce();

  // Tell screen reader users when a refresh changes the list, but not on the first load.
  const lastSeen = useRef<string | null>(null);
  const signature = data ? data.map((r) => `${r.id}:${r.status}`).join("|") : null;
  useEffect(() => {
    if (signature === null) return;
    if (lastSeen.current !== null && lastSeen.current !== signature) {
      announce("Your requests were updated.");
    }
    lastSeen.current = signature;
  }, [signature, announce]);

  return (
    <div className="apple-subpage">
      <BackLink />

      <div className="apple-page-header">
        <h1 className="ui-page-title">My requests</h1>
        {status === "success" && data && (
          <span className="apple-counter-badge">
            {data.length} {data.length === 1 ? "request" : "requests"}
          </span>
        )}
      </div>

      {status === "loading" ? <Spinner label="Loading your requests" /> : null}

      {status === "error" ? (
        <Banner message={error?.message ?? "We could not load your requests."} onRetry={refetch} />
      ) : null}

      {status === "success" && data && data.length === 0 ? (
        <div className="apple-empty-state">
          <div className="apple-empty-state__icon" aria-hidden="true">
            <IconList size={36} strokeWidth={1.5} />
          </div>
          <p className="ui-page-subtitle app-page-lead" style={{ margin: "8px 0 20px" }}>
            You have no requests yet.
          </p>
          <Button block onClick={() => navigate("/request")}>
            <IconPlus className="icon-gap" size={18} strokeWidth={2.4} aria-hidden="true" />
            Request help
          </Button>
        </div>
      ) : null}

      {status === "success" && data && data.length > 0 ? (
        <div className="apple-grouped-list">
          {data.map((req) => (
            <button
              key={req.id}
              type="button"
              className="apple-card-button"
              onClick={() => navigate(`/requests/${req.id}`)}
            >
              <div className="apple-card-button__body">
                <div className="apple-card-button__header">
                  <span className="ui-card-title" style={{ margin: 0 }}>
                    {req.title}
                  </span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="apple-card-button__desc">{formatWhen(req.scheduledAt)}</p>
                {req.description ? (
                  <p className="apple-card-button__desc">{req.description}</p>
                ) : null}
                {req.volunteerName && (
                  <span className="apple-card-button__volunteer">
                    Volunteer: <strong>{req.volunteerName}</strong>
                  </span>
                )}
              </div>
              <span className="apple-card-button__arrow" aria-hidden="true">
                <IconChevronRight size={18} strokeWidth={2} />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
