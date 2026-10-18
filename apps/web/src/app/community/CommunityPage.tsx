import { CloudOff, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AnnouncementCard,
  CategoryFilter,
  EventCard,
  EventDetailsModal,
  TownshipUpdateCard,
  TownshipUpdateModal,
  VolunteerCard,
  type FilterValue,
} from "../../components/community";
import {
  AppButton,
  ConfirmationDialog,
  DemoTag,
  EmptyState,
  FormField,
  InfoCard,
  LoadingState,
  Modal,
  PageHeader,
  Pill,
} from "../../components/ui";
import { ChallengesEntryCard } from "../../components/challenges";
import { useRole } from "../../components/layout";
import { useAcceptedTasks } from "../../data/AcceptedTasksContext";
import { apiFetch, errorMessage, useSession } from "@sdh/api-client";
import { useCommunityItems } from "../../data/useCommunityItems";
import { formatDate } from "../../lib/format";
import { DEMO_TOWNSHIP } from "../../lib/township";
import type {
  CommunityItem,
  EventItem,
  TownshipUpdateItem,
  VolunteerItem,
} from "../../types/community";

const EMPTY_COUNTS: Record<FilterValue, number> = {
  all: 0,
  event: 0,
  maintenance: 0,
  volunteer: 0,
  township: 0,
};

export function CommunityPage() {
  const { items, loading, error, usingSampleData, reload } = useCommunityItems();
  const { userId } = useSession();
  // Joined events also show in Volunteer → My accepted tasks.
  const { refresh: refreshTasks } = useAcceptedTasks();
  const { role } = useRole();

  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [activeUpdate, setActiveUpdate] = useState<TownshipUpdateItem | null>(null);
  const [joinedVolunteerIds, setJoinedVolunteerIds] = useState<Set<string>>(new Set());
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  // Success confirmation shown after registering/joining. null = hidden.
  const [confirmation, setConfirmation] = useState<{ title: string; message: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Highest-priority township update, else the newest item, as the featured notice.
  const featured = useMemo<CommunityItem | undefined>(() => {
    const highPriority = items.find(
      (item): item is TownshipUpdateItem =>
        item.category === "township" && item.priority === "high",
    );
    return highPriority ?? items[0];
  }, [items]);

  const counts = useMemo<Record<FilterValue, number>>(() => {
    const next = { ...EMPTY_COUNTS, all: items.length };
    for (const item of items) next[item.category] += 1;
    return next;
  }, [items]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.category !== filter) return false;
      if (!query) return true;
      return item.title.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query);
    });
  }, [items, filter, search]);

  function joinVolunteer(item: VolunteerItem) {
    setJoinedVolunteerIds((prev) => new Set(prev).add(item.id));
    setConfirmation({
      title: "You're signed up to volunteer",
      message: `Thanks for joining "${item.title}" with ${item.organisation}. This is a demo sign-up saved only in this browser session.`,
    });
  }

  async function registerEvent(event: EventItem) {
    // Live events need a signed-in demo user; otherwise it's a local demo sign-up.
    const live = userId !== null && !event.isDemoData;
    // Close the details dialog so the success confirmation takes over.
    setActiveEvent(null);
    if (live) {
      try {
        await apiFetch(`/api/events/${encodeURIComponent(event.id)}/join`, {
          method: "POST",
          userId,
        });
      } catch (err) {
        setFailure(errorMessage(err));
        return;
      } finally {
        await Promise.all([reload(), refreshTasks()]);
      }
    }
    setRegisteredEventIds((prev) => new Set(prev).add(event.id));
    setConfirmation({
      title: "You're registered",
      message: `See you at "${event.title}" on ${formatDate(event.startsAt)}.${live ? "" : " This is a demo sign-up saved only in this browser session."}`,
    });
  }

  function renderCard(item: CommunityItem) {
    switch (item.category) {
      case "event":
        return <EventCard key={item.id} event={item} onViewDetails={setActiveEvent} />;
      case "maintenance":
        return <AnnouncementCard key={item.id} item={item} />;
      case "volunteer":
        return (
          <VolunteerCard
            key={item.id}
            item={item}
            joined={joinedVolunteerIds.has(item.id)}
            onJoin={joinVolunteer}
          />
        );
      case "township":
        return <TownshipUpdateCard key={item.id} item={item} onReadMore={setActiveUpdate} />;
    }
  }

  return (
    <>
      <PageHeader
        title="Neighbourhood Hub"
        subtitle="Everything happening in your township - events, maintenance, volunteering and official updates."
        actions={<Pill>{DEMO_TOWNSHIP.name}</Pill>}
      />

      {role === "young" && (
        <section className="ui-section" aria-label="Community Challenges">
          <ChallengesEntryCard />
        </section>
      )}

      {loading ? (
        <LoadingState rows={3} label="Loading community updates" />
      ) : (
        <>
          {error && (
            <InfoCard>
              <EmptyState
                icon={CloudOff}
                title="Couldn't load community events"
                description={error}
                action={
                  <AppButton variant="secondary" onClick={() => void reload()}>
                    Try again
                  </AppButton>
                }
              />
            </InfoCard>
          )}
          {usingSampleData && (
            <p className="ui-helper live-hint" role="status">
              Showing sample data. The live events list was empty or could not be reached.
            </p>
          )}
          {featured && (
            <section className="ui-section" aria-labelledby="featured-heading">
              <h2 className="ui-visually-hidden" id="featured-heading">
                Featured update
              </h2>
              <InfoCard className="featured-card">
                <div className="feature-card">
                  <div className="feature-card-head">
                    <span
                      className="inline-icon"
                      style={{ color: "var(--brand-primary)", fontWeight: 700 }}
                    >
                      <Star size={18} aria-hidden="true" />
                      Featured update
                    </span>
                    {featured.isDemoData && <DemoTag />}
                  </div>
                  <h3 className="feature-card-title">{featured.title}</h3>
                  <p className="feature-card-desc">{featured.summary}</p>
                  <div className="ui-meta-row">
                    <span>{formatDate(featured.updatedAt)}</span>
                    <span className="ui-meta-dot" aria-hidden="true">
                      •
                    </span>
                    <span>{featured.sourceLabel}</span>
                  </div>
                </div>
              </InfoCard>
            </section>
          )}

          <section className="ui-section" aria-labelledby="filter-heading">
            <h2 className="ui-section-title" id="filter-heading">
              Browse updates
            </h2>
            <div className="ui-stack">
              <CategoryFilter value={filter} counts={counts} onChange={setFilter} />
              <div style={{ maxWidth: 420 }}>
                <FormField
                  label="Search updates"
                  type="search"
                  placeholder="Search by title or description"
                  icon={<Search size={18} />}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="ui-section" aria-labelledby="results-heading">
            <h2 className="ui-section-title" id="results-heading">
              {filter === "all" ? "All updates" : `Filtered: ${counts[filter]} item(s)`}
            </h2>
            <p className="results-count" aria-live="polite">
              {visible.length} update{visible.length === 1 ? "" : "s"} shown
            </p>
            {visible.length === 0 ? (
              <InfoCard>
                <EmptyState
                  title="No updates match your filter"
                  description="Try a different category or clear your search."
                />
              </InfoCard>
            ) : (
              <ul className="ui-grid community-list">{visible.map(renderCard)}</ul>
            )}
          </section>
        </>
      )}

      <EventDetailsModal
        event={activeEvent}
        registered={
          activeEvent
            ? registeredEventIds.has(activeEvent.id) || activeEvent.joined === true
            : false
        }
        onClose={() => setActiveEvent(null)}
        onRegister={(event) => void registerEvent(event)}
      />
      <TownshipUpdateModal item={activeUpdate} onClose={() => setActiveUpdate(null)} />
      <Modal
        open={failure !== null}
        title="Couldn't register"
        onClose={() => setFailure(null)}
        footer={
          <AppButton variant="primary" onClick={() => setFailure(null)}>
            OK
          </AppButton>
        }
      >
        <p className="ui-flush" role="alert">
          {failure}
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
