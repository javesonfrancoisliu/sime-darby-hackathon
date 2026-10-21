import { AlertTriangle, Bell, CalendarDays, CloudOff, HandHeart } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  AnnouncementCard,
  EventCard,
  TownshipUpdateCard,
  VolunteerCard,
} from "../../components/community";
import {
  AppButton,
  ConfirmActionDialog,
  ConfirmationDialog,
  EmptyState,
  InfoCard,
  LoadingState,
  Modal,
  PageHeader,
  Tabs,
  TabPanel,
} from "../../components/ui";
import { useConfirm } from "../../lib/useConfirm";
import { useRole } from "../../components/layout";
import { useAcceptedTasks, type AcceptedTask } from "../../data/AcceptedTasksContext";
import { CompleteTaskModal, MyTasksSection } from "../../components/volunteer";
import { errorMessage } from "@sdh/api-client";
import { useCommunityItems } from "../../data/useCommunityItems";
import {
  COMMUNITY_TAB_PARAM,
  communityCategoryFromParam,
  type CommunityCategory,
} from "../../lib/community";
import { formatDate } from "../../lib/format";
import type { CommunityItem, EventItem, VolunteerItem } from "../../types/community";

type CommunityTab = CommunityCategory;
const COMMUNITY_TABS = [
  { id: "event" as const, label: "Events", icon: <CalendarDays size={18} /> },
  { id: "maintenance" as const, label: "Notices", icon: <AlertTriangle size={18} /> },
  { id: "volunteer" as const, label: "Volunteer", icon: <HandHeart size={18} /> },
  { id: "township" as const, label: "Updates", icon: <Bell size={18} /> },
];
const COMMUNITY_HEADINGS: Record<CommunityTab, string> = {
  event: "Activities & Upcoming Events",
  maintenance: "Maintenance & Notices",
  volunteer: "Volunteering Opportunities",
  township: "Township Updates",
};
const NO_TASK_POINTS = new Map<string, number>();

export function CommunityPage() {
  const { items, loading, error, reload } = useCommunityItems();
  const { joinEvent, tasks, complete } = useAcceptedTasks();
  const { role } = useRole();

  const [searchParams, setSearchParams] = useSearchParams();
  const filter = communityCategoryFromParam(searchParams.get("tab"));
  function setFilter(next: CommunityTab) {
    setSearchParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set("tab", COMMUNITY_TAB_PARAM[next]);
      return updated;
    });
  }
  // Success confirmation shown after registering/joining. null = hidden.
  const [confirmation, setConfirmation] = useState<{ title: string; message: string } | null>(null);
  const [failure, setFailure] = useState<{ title: string; message: string } | null>(null);
  const confirm = useConfirm();
  const [completing, setCompleting] = useState<AcceptedTask | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const joinedActivities = tasks.filter(
    (task) =>
      task.kind === "event" &&
      (filter === "volunteer"
        ? task.eventPurpose === "volunteer_drive"
        : filter === "event" && task.eventPurpose !== "volunteer_drive"),
  );

  async function completeActivity(task: AcceptedTask, minutes: number) {
    setCompleteBusy(true);
    setCompleteError(null);
    try {
      await complete(task.id, minutes);
      await reload();
      setCompleting(null);
      setConfirmation({
        title: "Marked as completed",
        message:
          task.eventPurpose === "volunteer_drive"
            ? `Your attendance for "${task.title}" has been recorded. Points are added once the organiser closes the drive.`
            : `Your attendance for "${task.title}" has been recorded.`,
      });
    } catch (err) {
      setCompleteError(errorMessage(err));
    } finally {
      setCompleteBusy(false);
    }
  }

  const visible = useMemo(() => items.filter((item) => item.category === filter), [items, filter]);

  // Joins through the API, then reloads so the card shows the saved state and the new count.
  async function join(item: EventItem | VolunteerItem): Promise<boolean> {
    try {
      await joinEvent(item.id);
      return true;
    } catch (err) {
      setFailure({
        title: item.category === "volunteer" ? "Couldn't sign you up" : "Couldn't register",
        message: errorMessage(err),
      });
      return false;
    } finally {
      await reload();
    }
  }

  function askJoinVolunteer(item: VolunteerItem) {
    confirm.ask({
      title: "Join this volunteering activity?",
      message: `Sign up for "${item.title}"${item.organiser ? ` with ${item.organiser}` : ""}?`,
      confirmLabel: "Yes, join",
      onConfirm: () => joinVolunteer(item),
    });
  }

  async function joinVolunteer(item: VolunteerItem) {
    if (!(await join(item))) return;
    setConfirmation({
      title: "You're signed up to volunteer",
      message: `Thanks for joining "${item.title}"${item.organiser ? ` with ${item.organiser}` : ""}. We'll see you on ${formatDate(item.startsAt)}.`,
    });
  }

  function askRegisterEvent(event: EventItem) {
    confirm.ask({
      title: "Register for this event?",
      message: `Register to attend "${event.title}" on ${formatDate(event.startsAt)}?`,
      confirmLabel: "Yes, register",
      onConfirm: () => registerEvent(event),
    });
  }

  async function registerEvent(event: EventItem) {
    if (!(await join(event))) return;
    setConfirmation({
      title: "You're registered",
      message: `See you at "${event.title}" on ${formatDate(event.startsAt)}.`,
    });
  }

  function renderCard(item: CommunityItem) {
    switch (item.category) {
      case "event":
        return <EventCard key={item.id} event={item} onRegister={askRegisterEvent} />;
      case "maintenance":
        return <AnnouncementCard key={item.id} item={item} />;
      case "volunteer":
        return (
          <VolunteerCard
            key={item.id}
            item={item}
            joined={item.joined === true}
            onJoin={askJoinVolunteer}
          />
        );
      case "township":
        return <TownshipUpdateCard key={item.id} item={item} />;
    }
  }

  return (
    <>
      <PageHeader
        title="Neighbourhood Hub"
        subtitle="Everything happening in your township - events, maintenance, volunteering and official updates."
      />

      {loading ? (
        <LoadingState rows={3} label="Loading community updates" />
      ) : (
        <>
          {error && (
            <InfoCard>
              <EmptyState
                icon={CloudOff}
                title="Couldn't load community updates"
                description={error}
                action={
                  <AppButton variant="secondary" onClick={() => void reload()}>
                    Try again
                  </AppButton>
                }
              />
            </InfoCard>
          )}
          <Tabs
            idBase="community"
            label="Community categories"
            tabs={COMMUNITY_TABS}
            value={filter}
            onChange={setFilter}
          />
          <TabPanel key={filter} idBase="community" id={filter}>
            {role === "young" && (
              <MyTasksSection
                title="My joined activities"
                tasks={joinedActivities}
                pointsByTask={NO_TASK_POINTS}
                onComplete={(task) => {
                  setCompleteError(null);
                  setCompleting(task);
                }}
              />
            )}
            <section className="ui-section" aria-labelledby="results-heading">
              <h2 className="ui-section-title" id="results-heading">
                {COMMUNITY_HEADINGS[filter]}
              </h2>
              <p className="results-count" aria-live="polite">
                {visible.length} update{visible.length === 1 ? "" : "s"} shown
              </p>
              {visible.length === 0 ? (
                <InfoCard>
                  <EmptyState
                    title="No updates in this category yet"
                    description="Check another tab or come back later for new updates."
                  />
                </InfoCard>
              ) : (
                <ul className="ui-grid community-list">{visible.map(renderCard)}</ul>
              )}
            </section>
          </TabPanel>
        </>
      )}

      <CompleteTaskModal
        key={completing?.id ?? "none"}
        task={completing}
        busy={completeBusy}
        error={completeError}
        onClose={() => setCompleting(null)}
        onConfirm={(task, minutes) => void completeActivity(task, minutes)}
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
