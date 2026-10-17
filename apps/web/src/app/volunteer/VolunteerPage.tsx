import { MapPin, Navigation } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CompleteTaskModal,
  MyTasksSection,
  OpportunityCard,
  OpportunitySort,
  VerifiedBadge,
  type SortOption,
} from "../../components/volunteer";
import { AppButton, ConfirmationDialog, EmptyState, InfoCard, LoadingState, PageHeader } from "../../components/ui";
import { useAcceptedTasks, type AcceptedTask } from "../../data/AcceptedTasksContext";
import { useGamification } from "../../data/useGamification";
import { useVolunteerData } from "../../data/useVolunteer";
import { formatDate } from "../../lib/format";
import { distanceKm } from "../../lib/geo";
import { useGeolocation } from "../../lib/useGeolocation";
import { URGENCY_RANK, type Opportunity } from "../../types/volunteer";

// Demo points granted for a VERIFIED volunteering task. Flat value for the
// prototype; a real system would derive this server-side.
const VOLUNTEERING_POINTS = 60;

export function VolunteerPage() {
  const { opportunities, loading } = useVolunteerData();
  const geo = useGeolocation();
  const { tasks, isAccepted, accept, complete, verify } = useAcceptedTasks();
  const { verifyVolunteering } = useGamification();

  const [sort, setSort] = useState<SortOption>("nearest");
  const [completing, setCompleting] = useState<AcceptedTask | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string } | null>(
    null,
  );

  // Effective distance per opportunity: live (from user coords) when we have
  // both a granted location and the item's approximate coords; else the baked
  // fallback. Keyed by id so the card and the sort agree.
  const distances = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of opportunities) {
      if (geo.status === "granted" && geo.coords && o.coords) {
        map.set(o.id, distanceKm(geo.coords, o.coords));
      } else {
        map.set(o.id, o.distanceKm);
      }
    }
    return map;
  }, [opportunities, geo.status, geo.coords]);

  const visible = useMemo(() => {
    const dist = (o: Opportunity) => distances.get(o.id) ?? o.distanceKm;
    const sorted = [...opportunities];
    switch (sort) {
      case "nearest":
        sorted.sort((a, b) => dist(a) - dist(b));
        break;
      case "soonest":
        sorted.sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        );
        break;
      case "urgent":
        sorted.sort((a, b) => {
          const byUrgency = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
          if (byUrgency !== 0) return byUrgency;
          // Tie-break urgent items by soonest, then nearest.
          const byTime =
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
          return byTime !== 0 ? byTime : dist(a) - dist(b);
        });
        break;
    }
    return sorted;
  }, [opportunities, sort, distances]);

  function handleAccept(opportunity: Opportunity) {
    accept(opportunity);
    setConfirmation({
      title: "Thanks for stepping up",
      message: `You accepted "${opportunity.title}" on ${formatDate(opportunity.scheduledAt)}. It's now in "My accepted tasks". This is a demo sign-up saved only in this browser session.`,
    });
  }

  function handleComplete(task: AcceptedTask) {
    // Self-reported only — no points yet.
    complete(task.id);
    setCompleting(null);
    setConfirmation({
      title: "Marked as completed",
      message: `You marked "${task.title}" as completed. It still needs the resident's confirmation before it counts as verified. Demo only.`,
    });
  }

  function handleVerify(task: AcceptedTask) {
    // Simulated resident confirmation. Marks the task verified AND awards
    // de-duped volunteering points (shared dedupeKey prevents paying the same
    // activity twice if it is also a challenge). Counted as one verified task.
    verify(task.id);
    verifyVolunteering({
      taskId: task.id,
      points: VOLUNTEERING_POINTS,
      label: task.title,
      dedupeKey: task.dedupeKey,
    });
    setConfirmation({
      title: "Participation verified (demo)",
      message: `"${task.title}" is verified. You earned ${VOLUNTEERING_POINTS} demo points and it counts toward your volunteering milestones.`,
    });
  }

  const usingLive = geo.status === "granted";

  return (
    <>
      <PageHeader title="Volunteer nearby" actions={<VerifiedBadge status="verified" />} />

      {loading ? (
        <LoadingState rows={3} label="Loading volunteering opportunities" />
      ) : (
        <>
          <MyTasksSection tasks={tasks} onComplete={setCompleting} onVerify={handleVerify} />

          <section className="ui-section" aria-labelledby="browse-heading">
            <h2 className="ui-visually-hidden" id="browse-heading">
              Browse opportunities
            </h2>

            <div className="geo-hint">
              <MapPin size={16} aria-hidden="true" />
              {usingLive ? (
                <span>Sorted by your current location.</span>
              ) : (
                <>
                  <span>
                    {geo.status === "denied" || geo.status === "unavailable"
                      ? "Using demo locations."
                      : "Using demo locations until you share your location."}
                  </span>
                  {geo.status !== "unavailable" && (
                    <AppButton
                      variant="ghost"
                      onClick={geo.request}
                      loading={geo.status === "locating"}
                    >
                      <Navigation size={16} aria-hidden="true" />
                      Use my location
                    </AppButton>
                  )}
                </>
              )}
            </div>

            <div className="results-bar">
              <span className="results-count" aria-live="polite">
                {visible.length} opportunit{visible.length === 1 ? "y" : "ies"}
              </span>
              <OpportunitySort value={sort} onChange={setSort} />
            </div>

            {visible.length === 0 ? (
              <InfoCard>
                <EmptyState
                  icon={MapPin}
                  title="No opportunities right now"
                  description="Please check back later for new ways to help your neighbours."
                />
              </InfoCard>
            ) : (
              <ul className="ui-grid community-list">
                {visible.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    liveDistanceKm={
                      usingLive && opportunity.coords ? distances.get(opportunity.id) : undefined
                    }
                    joined={isAccepted(opportunity.id)}
                    onAccept={handleAccept}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <CompleteTaskModal
        key={completing?.id ?? "none"}
        task={completing}
        onClose={() => setCompleting(null)}
        onConfirm={handleComplete}
      />

      <ConfirmationDialog
        open={confirmation !== null}
        title={confirmation?.title ?? ""}
        message={confirmation?.message ?? ""}
        onClose={() => setConfirmation(null)}
      />
    </>
  );
}
