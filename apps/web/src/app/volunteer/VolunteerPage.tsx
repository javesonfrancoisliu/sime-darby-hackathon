import { CloudOff, MapPin, ShieldQuestion } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CompleteTaskModal,
  MyTasksSection,
  OpportunityCard,
  OpportunitySort,
  type SortOption,
} from "../../components/volunteer";
import {
  AppButton,
  ConfirmActionDialog,
  ConfirmationDialog,
  AppLinkButton,
  EmptyState,
  InfoCard,
  LoadingState,
  Modal,
  PageHeader,
  SignInPrompt,
} from "../../components/ui";
import { useConfirm } from "../../lib/useConfirm";
import { useAcceptedTasks, type AcceptedTask } from "../../data/AcceptedTasksContext";
import { VolunteerLevelBadge } from "../../components/volunteer/VolunteerLevelBadge";
import { useProfile } from "../../data/ProfileContext";
import { usePoints } from "../../data/useGamification";
import { useVolunteerData } from "../../data/useVolunteer";
import { errorMessage, useSession } from "@sdh/api-client";
import { formatDate } from "../../lib/format";
import { useNow } from "../../lib/useNow";
import { urgencyFor } from "../../lib/urgency";
import { URGENCY_RANK, type Opportunity } from "../../types/volunteer";

// How often the urgency badges and the "Most urgent" order are worked out again.
const URGENCY_REFRESH_MS = 60_000;

export function VolunteerPage() {
  const { opportunities, impact, impactError, loading, error, notVerified, reload } =
    useVolunteerData();
  const { user } = useSession();
  const now = useNow(URGENCY_REFRESH_MS);
  const {
    tasks,
    isAccepted,
    accept,
    complete,
    withdraw,
    loading: tasksLoading,
    error: tasksError,
    refresh: refreshTasks,
  } = useAcceptedTasks();
  const points = usePoints();
  const { verification } = useProfile();

  const [sort, setSort] = useState<SortOption>("best_match");
  const [completing, setCompleting] = useState<AcceptedTask | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ title: string; message: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string } | null>(null);
  const confirm = useConfirm();

  // Points the server awarded per volunteering task, to show next to each confirmed task.
  const pointsByTask = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of points.data?.ledger?.items ?? []) {
      if (entry.sourceType === "volunteering") map.set(entry.sourceId, entry.points);
    }
    return map;
  }, [points.data]);

  const visible = useMemo(() => {
    const dist = (o: Opportunity) => o.distanceKm;
    const sorted = opportunities.filter((item) => item.kind === "request");
    switch (sort) {
      case "best_match":
        // The API order follows its own fit scale, not the shown score, so sort by the shown score.
        sorted.sort(
          (a, b) =>
            b.matchScore - a.matchScore ||
            (a.matchRank ?? Number.MAX_SAFE_INTEGER) - (b.matchRank ?? Number.MAX_SAFE_INTEGER) ||
            dist(a) - dist(b),
        );
        break;
      case "nearest":
        sorted.sort((a, b) => dist(a) - dist(b) || b.matchScore - a.matchScore);
        break;
      case "soonest":
        sorted.sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        );
        break;
      case "urgent":
        sorted.sort((a, b) => {
          // Urgent requests come before events; prioritize fit within each time window.
          const rank = (item: Opportunity) =>
            item.kind === "request" ? URGENCY_RANK[urgencyFor(item.scheduledAt, now)] : 4;
          const byUrgency = rank(a) - rank(b);
          if (byUrgency !== 0) return byUrgency;
          const byMatch = b.matchScore - a.matchScore;
          if (byMatch !== 0) return byMatch;
          const byTime = Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt);
          return byTime || dist(a) - dist(b);
        });
        break;
    }
    return sorted;
  }, [opportunities, sort, now]);

  function askAccept(opportunity: Opportunity) {
    confirm.ask({
      title: opportunity.kind === "event" ? "Join this event?" : "Accept this request?",
      message: `Do you want to ${opportunity.kind === "event" ? "join" : "help with"} "${opportunity.title}" on ${formatDate(opportunity.scheduledAt)}?`,
      confirmLabel: opportunity.kind === "event" ? "Yes, join" : "Yes, accept",
      onConfirm: () => handleAccept(opportunity),
    });
  }

  async function handleAccept(opportunity: Opportunity) {
    setAcceptingId(opportunity.id);
    try {
      await accept(opportunity);
      // Refresh the feed first so the accepted card is already gone from it.
      await reload();
      void points.reload();
      setConfirmation({
        title: "Thanks for stepping up",
        message: `You ${opportunity.kind === "event" ? "joined" : "accepted"} "${opportunity.title}" on ${formatDate(opportunity.scheduledAt)}. It's now in "My accepted tasks".`,
      });
    } catch (err) {
      setFailure({ title: "Couldn't accept this task", message: errorMessage(err) });
      // Someone else may have taken it, so the feed has changed.
      await reload();
    } finally {
      setAcceptingId(null);
    }
  }

  function openComplete(task: AcceptedTask) {
    setCompleteError(null);
    setCompleting(task);
  }

  // Rejects on failure so the card can show why; the feed is refreshed so the task is back in it.
  async function handleWithdraw(task: AcceptedTask) {
    await withdraw(task.id);
    await reload();
  }

  async function handleComplete(task: AcceptedTask, minutesSpent: number) {
    // Volunteer-reported only - no points yet.
    setCompleteBusy(true);
    setCompleteError(null);
    try {
      await complete(task.id, minutesSpent);
      await reload(); // volunteer hours changed
      setCompleting(null);
      setConfirmation({
        title: "Marked as completed",
        message:
          task.kind === "event"
            ? `You confirmed "${task.title}" as completed. Your volunteer level progress has been updated.`
            : `You marked "${task.title}" as completed (${minutesSpent} min). Your points are added once the resident confirms it.`,
      });
    } catch (err) {
      setCompleteError(errorMessage(err));
    } finally {
      setCompleteBusy(false);
    }
  }

  if (!user) {
    return (
      <>
        <PageHeader title="Volunteer nearby" />
        <SignInPrompt what="ways to help nearby" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Volunteer nearby"
        actions={
          user && !loading && !impactError ? (
            <VolunteerLevelBadge completed={impact.completedCount} />
          ) : undefined
        }
      />

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
          <MyTasksSection
            tasks={tasks.filter((task) => task.kind === "request")}
            onComplete={openComplete}
            onWithdraw={handleWithdraw}
            pointsByTask={pointsByTask}
          />

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
                    ? "A coordinator did not approve your profile, so requests stay hidden."
                    : "A coordinator needs to verify your profile before you can see neighbours' requests."
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
                <span>Distances are measured from your saved area.</span>
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
                      urgency={urgencyFor(opportunity.scheduledAt, now)}
                      joined={isAccepted(opportunity.id)}
                      accepting={acceptingId === opportunity.id}
                      onAccept={askAccept}
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
        <p className="ui-flush" role="alert">
          {failure?.message}
        </p>
      </Modal>

      <ConfirmActionDialog
        open={confirm.open}
        title={confirm.request?.title ?? ""}
        message={confirm.request?.message ?? ""}
        confirmLabel={confirm.request?.confirmLabel}
        cancelLabel={confirm.request?.cancelLabel}
        confirmVariant={confirm.request?.confirmVariant}
        busy={confirm.busy}
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
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
