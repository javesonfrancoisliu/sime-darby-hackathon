import { CloudOff, MapPin, Navigation, ShieldQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

import {
  CompleteTaskModal,
  MyTasksSection,
  OpportunityCard,
  OpportunitySort,
  VerifiedBadge,
  type SortOption,
} from "../../components/volunteer";
import {
  AppButton,
  ConfirmationDialog,
  AppLinkButton,
  EmptyState,
  InfoCard,
  LoadingState,
  Modal,
  PageHeader,
} from "../../components/ui";
import { useAcceptedTasks, type AcceptedTask } from "../../data/AcceptedTasksContext";
import { useProfile } from "../../data/ProfileContext";
import { useGamification } from "../../data/useGamification";
import { useVolunteerData } from "../../data/useVolunteer";
import { errorMessage } from "@sdh/api-client";
import { formatDate } from "../../lib/format";
import { distanceKm } from "../../lib/geo";
import { useGeolocation } from "../../lib/useGeolocation";
import { URGENCY_RANK, type Opportunity } from "../../types/volunteer";

// Demo points granted for a VERIFIED volunteering task. Flat value for the
// prototype; a real system would derive this server-side.
const VOLUNTEERING_POINTS = 60;

export function VolunteerPage() {
  const { opportunities, loading, error, notVerified, live, reload } = useVolunteerData();
  const geo = useGeolocation();
  const {
    tasks,
    isAccepted,
    accept,
    complete,
    verify,
    loading: tasksLoading,
    error: tasksError,
    refresh: refreshTasks,
  } = useAcceptedTasks();
  const { verifyVolunteering } = useGamification();
  const { verification } = useProfile();

  const [sort, setSort] = useState<SortOption>("nearest");
  const [completing, setCompleting] = useState<AcceptedTask | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ title: string; message: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string } | null>(null);

  // Signed in, distances come from the server only: it measures from the saved
  // profile location, and mixing in the device position would disagree with it.
  const useDevice = !live && geo.status === "granted";

  // Effective distance per opportunity: from the device when allowed and the
  // item has approximate coords; else the distance on the item. Keyed by id so
  // the card and the sort agree.
  const distances = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of opportunities) {
      if (useDevice && geo.coords && o.coords) {
        map.set(o.id, distanceKm(geo.coords, o.coords));
      } else {
        map.set(o.id, o.distanceKm);
      }
    }
    return map;
  }, [opportunities, useDevice, geo.coords]);

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
          const byTime = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
          return byTime !== 0 ? byTime : dist(a) - dist(b);
        });
        break;
    }
    return sorted;
  }, [opportunities, sort, distances]);

  async function handleAccept(opportunity: Opportunity) {
    setAcceptingId(opportunity.id);
    try {
      await accept(opportunity);
      // Refresh the feed first so the accepted card is already gone from it.
      if (live) await reload();
      setConfirmation({
        title: "Thanks for stepping up",
        message: `You ${opportunity.kind === "event" ? "joined" : "accepted"} "${opportunity.title}" on ${formatDate(opportunity.scheduledAt)}. It's now in "My accepted tasks".${live ? "" : " This is a demo sign-up saved only in this browser."}`,
      });
    } catch (err) {
      setFailure({ title: "Couldn't accept this task", message: errorMessage(err) });
      // Someone else may have taken it, so the feed has changed.
      if (live) await reload();
    } finally {
      setAcceptingId(null);
    }
  }

  function openComplete(task: AcceptedTask) {
    setCompleteError(null);
    setCompleting(task);
  }

  async function handleComplete(task: AcceptedTask, minutesSpent: number) {
    // Volunteer-reported only - no points yet.
    setCompleteBusy(true);
    setCompleteError(null);
    try {
      await complete(task.id, minutesSpent);
      if (live) await reload(); // volunteer hours changed
      setCompleting(null);
      setConfirmation({
        title: "Marked as completed",
        message: `You marked "${task.title}" as completed (${minutesSpent} min). It still needs the resident's confirmation before it counts as verified.`,
      });
    } catch (err) {
      setCompleteError(errorMessage(err));
    } finally {
      setCompleteBusy(false);
    }
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

  return (
    <>
      <PageHeader title="Volunteer nearby" actions={<VerifiedBadge status={verification} />} />

      {!live && (
        <p className="ui-helper live-hint">
          Showing demo data. <Link to="/profile">Sign in as a demo user</Link> to use the live
          service.
        </p>
      )}

      {loading || tasksLoading ? (
        <LoadingState rows={3} label="Loading volunteering opportunities" />
      ) : (
        <>
          {tasksError && (
            <InfoCard>
              <EmptyState
                icon={CloudOff}
                title="Couldn't load your accepted tasks"
                description={tasksError}
                action={
                  <AppButton variant="secondary" onClick={() => void refreshTasks()}>
                    Try again
                  </AppButton>
                }
              />
            </InfoCard>
          )}
          <MyTasksSection tasks={tasks} onComplete={openComplete} onVerify={handleVerify} />

          {notVerified ? (
            <InfoCard>
              <EmptyState
                icon={ShieldQuestion}
                title={
                  verification === "rejected"
                    ? "Your volunteer profile was not approved"
                    : "Your volunteer profile is waiting for approval"
                }
                description={
                  verification === "rejected"
                    ? "A coordinator did not approve your profile, so requests stay hidden. You can still join community events."
                    : "A coordinator needs to verify your profile before you can see neighbours' requests. You can still join community events while you wait."
                }
                action={<AppLinkButton to="/community">See community events</AppLinkButton>}
              />
            </InfoCard>
          ) : error ? (
            <InfoCard>
              <EmptyState
                icon={CloudOff}
                title="Couldn't load opportunities"
                description={error}
                action={
                  <AppButton variant="secondary" onClick={() => void reload()}>
                    Try again
                  </AppButton>
                }
              />
            </InfoCard>
          ) : (
            <section className="ui-section" aria-labelledby="browse-heading">
              <h2 className="ui-visually-hidden" id="browse-heading">
                Browse opportunities
              </h2>

              <div className="geo-hint">
                <MapPin size={16} aria-hidden="true" />
                {live ? (
                  <span>Distances are measured from your saved area.</span>
                ) : useDevice ? (
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
                        useDevice && opportunity.coords ? distances.get(opportunity.id) : undefined
                      }
                      joined={isAccepted(opportunity.id)}
                      accepting={acceptingId === opportunity.id}
                      onAccept={(o) => void handleAccept(o)}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <CompleteTaskModal
        key={completing?.id ?? "none"}
        task={completing}
        busy={completeBusy}
        error={completeError}
        onClose={() => setCompleting(null)}
        onConfirm={(task, minutes) => void handleComplete(task, minutes)}
      />

      <Modal
        open={failure !== null}
        title={failure?.title ?? ""}
        onClose={() => setFailure(null)}
        footer={
          <AppButton variant="primary" onClick={() => setFailure(null)}>
            OK
          </AppButton>
        }
      >
        <p style={{ margin: 0 }} role="alert">
          {failure?.message}
        </p>
      </Modal>

      <ConfirmationDialog
        open={confirmation !== null}
        title={confirmation?.title ?? ""}
        message={confirmation?.message ?? ""}
        onClose={() => setConfirmation(null)}
      />
    </>
  );
}
