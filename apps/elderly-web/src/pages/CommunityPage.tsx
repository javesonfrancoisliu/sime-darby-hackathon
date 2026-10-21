import { useId, useState, type ReactNode } from "react";
import { EVENT_CATEGORY_TEXT, maintenanceLabel, spotsLeft } from "../community/events";
import { useEvents, useJoinEvent } from "../hooks/useEvents";
import { formatShortDate, formatWhen, formatWindow, minutesLabel } from "../requests/schedule";
import { useResident } from "../session/useResident";
import { Banner } from "../ui/Banner";
import { Spinner } from "../ui/Spinner";
import { useNotices } from "../hooks/useNotices";
import {
  IconCalendar,
  IconAlertTriangle,
  IconHeartHandshake,
  IconBell,
  IconMapPin,
  IconClock,
  IconPin,
  IconUsers,
  IconCheck,
} from "../ui/Icons";
import { SegmentedTabs, TabPanel, type TabItem } from "../ui/SegmentedTabs";
import { Drawer } from "../ui/Drawer";
import { PageHeaderActions } from "../ui/PageHeaderActions";
import { useHashTab } from "../ui/useHashTab";
import { useAccessibility } from "../context/AccessibilityContext";

type CommunityTab = "events" | "maintenance" | "volunteer" | "updates";
const COMMUNITY_TABS: readonly CommunityTab[] = ["events", "maintenance", "volunteer", "updates"];

// Shared section heading with standardized outline icon
function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="safety-section__heading">
      <span className="safety-section__heading-icon" aria-hidden="true">
        {icon}
      </span>
      <h2 className="safety-section__heading-text">{title}</h2>
    </div>
  );
}

// Centralised Neighbourhood Information page with standardized monochrome outline icons.
// Sections:
// a. Community activities and upcoming events
// b. Facility maintenance announcements
// c. Community volunteering opportunities
// d. Important township updates
export function CommunityPage() {
  const maintenance = useNotices("maintenance");
  const updates = useNotices("update");
  const { speak, voiceAssist, triggerHaptic } = useAccessibility();
  const [tab, setTab] = useHashTab<CommunityTab>(COMMUNITY_TABS, "events");
  const groupId = useId();

  const resident = useResident();
  const events = useEvents("activity");
  const join = useJoinEvent();
  const drives = useEvents("volunteer_drive");
  const joinDrive = useJoinEvent();
  const [openNotice, setOpenNotice] = useState<string | null>(null);
  const [openUpdate, setOpenUpdate] = useState<string | null>(null);

  const upcoming = (events.data ?? []).filter((e) => e.status === "upcoming");
  const upcomingDrives = (drives.data ?? []).filter((e) => e.status === "upcoming");

  async function joinEvent(id: string, title: string) {
    triggerHaptic(18);
    const updated = await join.run(id);
    if (!updated) return;
    events.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
    if (voiceAssist) speak(`You are registered for ${title}.`);
  }

  async function signUpForDrive(id: string, title: string) {
    triggerHaptic(18);
    const updated = await joinDrive.run(id);
    if (!updated) return;
    drives.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
    if (voiceAssist) speak(`Thank you for signing up to help with ${title}.`);
  }

  const TABS: TabItem<CommunityTab>[] = [
    { id: "events", label: "Events", icon: <IconCalendar size={18} strokeWidth={2} /> },
    { id: "maintenance", label: "Notices", icon: <IconAlertTriangle size={18} strokeWidth={2} /> },
    { id: "volunteer", label: "Volunteer", icon: <IconHeartHandshake size={18} strokeWidth={2} /> },
    { id: "updates", label: "Updates", icon: <IconBell size={18} strokeWidth={2} /> },
  ];

  function handleReadCommunitySummary() {
    const place = resident?.area ?? "your township";
    speak(
      `Township community updates for ${place}. ${upcoming.length} upcoming ${upcoming.length === 1 ? "event" : "events"}.`,
    );
  }

  return (
    <div className="safety-page">
      <div className="safety-page__header">
        <div className="row-between">
          <div>
            <h1 className="safety-page__title">Community</h1>
            <p className="safety-page__subtitle">
              {resident?.area ?? "Elmina"} · Centralised Township Info
            </p>
          </div>
          <PageHeaderActions onReadAloud={handleReadCommunitySummary} />
        </div>
      </div>

      <SegmentedTabs
        groupId={groupId}
        tabs={TABS}
        active={tab}
        onChange={setTab}
        ariaLabel="Choose a community category"
      />

      {tab === "events" && (
        <TabPanel id="events" groupId={groupId}>
          <section
            className="safety-section seg-panel-enter"
            id="events"
            aria-label="Community events"
          >
            <SectionHeading
              icon={<IconCalendar size={22} strokeWidth={1.8} />}
              title="Activities &amp; Upcoming Events"
            />
            {events.status === "loading" && !events.data ? (
              <Spinner label="Loading events" />
            ) : null}
            {events.status === "error" ? (
              <Banner
                message={events.error?.message ?? "We could not load the events."}
                onRetry={events.refetch}
              />
            ) : null}
            {join.status === "error" ? (
              <Banner
                message={join.error?.message ?? "We could not register you. Please try again."}
              />
            ) : null}
            {events.data && upcoming.length === 0 ? (
              <p className="ui-page-subtitle app-page-lead">No events are planned yet.</p>
            ) : null}
            <div className="ui-stack">
              {upcoming.map((e) => {
                const spots = spotsLeft(e);
                return (
                  <div key={e.id} className="safety-card community-event-card">
                    <div className="safety-card__row">
                      <div className="community-event-card__icon" aria-hidden="true">
                        <IconCalendar size={24} strokeWidth={1.8} />
                      </div>
                      <div className="flex-fill">
                        <p className="safety-card__location">{e.title}</p>
                        <p className="safety-card__meta">
                          <IconClock className="icon-inline" size={12} strokeWidth={2} />
                          {formatWhen(e.startsAt)}
                        </p>
                        <p className="safety-card__meta">
                          <IconMapPin className="icon-inline" size={12} strokeWidth={2} />
                          {e.location.area}
                        </p>
                      </div>
                      <span className="community-category-chip">
                        {EVENT_CATEGORY_TEXT[e.category]}
                      </span>
                    </div>
                    <div className="community-spots">
                      <span className="community-spots__text">
                        {e.joined ? (
                          <>
                            You have a spot · <strong>{spots}</strong>{" "}
                            {spots === 1 ? "spot" : "spots"} left
                          </>
                        ) : spots === 0 ? (
                          <>This event is full</>
                        ) : (
                          <>
                            Only <strong>{spots}</strong> {spots === 1 ? "spot" : "spots"} left
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        className={`community-register-btn${e.joined ? " community-register-btn--done" : ""}`}
                        aria-label={e.joined || spots === 0 ? undefined : `Register for ${e.title}`}
                        aria-pressed={Boolean(e.joined)}
                        disabled={Boolean(e.joined) || spots === 0 || join.status === "loading"}
                        onClick={() => void joinEvent(e.id, e.title)}
                      >
                        {e.joined ? (
                          <>
                            <IconCheck size={16} strokeWidth={2.4} aria-hidden="true" />
                            Registered
                          </>
                        ) : spots === 0 ? (
                          "Full"
                        ) : (
                          "Register"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </TabPanel>
      )}

      {tab === "maintenance" && (
        <TabPanel id="maintenance" groupId={groupId}>
          <section
            className="safety-section seg-panel-enter"
            id="maintenance"
            aria-label="Maintenance announcements"
          >
            <SectionHeading
              icon={<IconAlertTriangle size={22} strokeWidth={1.8} />}
              title="Facility Maintenance Announcements"
            />
            {maintenance.status === "loading" && !maintenance.data ? (
              <Spinner label="Loading notices" />
            ) : null}
            {maintenance.status === "error" ? (
              <Banner
                message={maintenance.error?.message ?? "We could not load the notices."}
                onRetry={maintenance.refetch}
              />
            ) : null}
            {maintenance.data && maintenance.data.length === 0 ? (
              <p className="ui-page-subtitle app-page-lead">There are no notices right now.</p>
            ) : null}
            <div className="ui-stack">
              {(maintenance.data ?? []).map((m) => (
                <Drawer
                  key={m.id}
                  className="safety-card safety-card--drawer"
                  label={m.title}
                  open={openNotice === m.id}
                  onToggle={() => {
                    triggerHaptic(10);
                    setOpenNotice((cur) => (cur === m.id ? null : m.id));
                  }}
                  header={
                    <div className="safety-card__row m-0">
                      <div className="community-event-card__icon" aria-hidden="true">
                        <IconAlertTriangle size={24} strokeWidth={1.8} />
                      </div>
                      <div className="flex-fill">
                        <p className="safety-card__location">{m.title}</p>
                        <p className="safety-card__meta">
                          <IconMapPin className="icon-inline" size={12} strokeWidth={2} />
                          {m.area}
                        </p>
                        {m.windowStart && m.windowEnd ? (
                          <p className="safety-card__meta">
                            <IconCalendar className="icon-inline" size={12} strokeWidth={2} />
                            {formatWindow(m.windowStart, m.windowEnd)}
                          </p>
                        ) : null}
                      </div>
                      {m.status ? (
                        <span className="community-category-chip">
                          {maintenanceLabel(m.status, m.windowEnd)}
                        </span>
                      ) : null}
                    </div>
                  }
                >
                  <p className="safety-card__description">
                    {m.impact ?? "No further details were provided for this notice."}
                  </p>
                </Drawer>
              ))}
            </div>
          </section>
        </TabPanel>
      )}

      {tab === "volunteer" && (
        <TabPanel id="volunteer" groupId={groupId}>
          <section
            className="safety-section seg-panel-enter"
            id="volunteer"
            aria-label="Volunteering opportunities"
          >
            <SectionHeading
              icon={<IconHeartHandshake size={22} strokeWidth={1.8} />}
              title="Community Volunteering Opportunities"
            />
            {drives.status === "loading" && !drives.data ? (
              <Spinner label="Loading volunteering" />
            ) : null}
            {drives.status === "error" ? (
              <Banner
                message={drives.error?.message ?? "We could not load volunteering."}
                onRetry={drives.refetch}
              />
            ) : null}
            {joinDrive.status === "error" ? (
              <Banner
                message={joinDrive.error?.message ?? "We could not sign you up. Please try again."}
              />
            ) : null}
            {drives.data && upcomingDrives.length === 0 ? (
              <p className="ui-page-subtitle app-page-lead">
                No volunteering is planned right now.
              </p>
            ) : null}
            <div className="ui-stack">
              {upcomingDrives.map((v) => {
                const spots = spotsLeft(v);
                const pct = Math.min(Math.round((v.signupCount / v.capacity) * 100), 100);
                const joined = Boolean(v.joined);
                return (
                  <div key={v.id} className="safety-card">
                    <div className="safety-card__row">
                      <div className="community-event-card__icon" aria-hidden="true">
                        <IconUsers size={24} strokeWidth={1.8} />
                      </div>
                      <div className="flex-fill">
                        <p className="safety-card__location">{v.title}</p>
                        <p className="safety-card__meta">
                          <IconCalendar className="icon-inline" size={12} strokeWidth={2} />
                          {formatWhen(v.startsAt)} · {minutesLabel(v.durationMinutes)}
                        </p>
                        <p className="safety-card__meta">
                          <IconMapPin className="icon-inline" size={12} strokeWidth={2} />
                          {v.location.area}
                        </p>
                        {v.organiser ? (
                          <p className="safety-card__meta">Organised by {v.organiser}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="community-vol-progress">
                      <div className="safety-bar">
                        <div
                          className="safety-bar__fill"
                          style={{ width: `${pct}%`, background: "var(--brand-primary)" }}
                        />
                      </div>
                      <p className="community-vol-progress__label">
                        {v.signupCount} / {v.capacity} volunteers signed up
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`community-register-btn community-register-btn--full${joined ? " community-register-btn--done" : ""}`}
                      aria-label={joined || spots === 0 ? undefined : `I can help with ${v.title}`}
                      aria-pressed={joined}
                      disabled={joined || spots === 0 || joinDrive.status === "loading"}
                      onClick={() => void signUpForDrive(v.id, v.title)}
                    >
                      {joined ? (
                        <>
                          <IconCheck size={18} strokeWidth={2.4} aria-hidden="true" />
                          You&rsquo;re signed up
                        </>
                      ) : spots === 0 ? (
                        "Full"
                      ) : (
                        "I can help"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </TabPanel>
      )}

      {tab === "updates" && (
        <TabPanel id="updates" groupId={groupId}>
          <section
            className="safety-section seg-panel-enter"
            id="updates"
            aria-label="Township updates"
          >
            <SectionHeading
              icon={<IconBell size={22} strokeWidth={1.8} />}
              title="Important Township Updates"
            />
            {updates.status === "loading" && !updates.data ? (
              <Spinner label="Loading updates" />
            ) : null}
            {updates.status === "error" ? (
              <Banner
                message={updates.error?.message ?? "We could not load the updates."}
                onRetry={updates.refetch}
              />
            ) : null}
            {updates.data && updates.data.length === 0 ? (
              <p className="ui-page-subtitle app-page-lead">There are no updates right now.</p>
            ) : null}
            <div className="ui-stack">
              {(updates.data ?? []).map((u) => {
                const important = u.priority === "high";
                return (
                  <Drawer
                    key={u.id}
                    className={`safety-card safety-card--drawer${important ? " safety-card--pinned" : ""}`}
                    label={u.title}
                    open={openUpdate === u.id}
                    onToggle={() => {
                      triggerHaptic(10);
                      setOpenUpdate((cur) => (cur === u.id ? null : u.id));
                    }}
                    header={
                      <div className="safety-card__row m-0">
                        <div className="community-event-card__icon" aria-hidden="true">
                          <IconBell size={24} strokeWidth={1.8} />
                        </div>
                        <div className="flex-fill">
                          <div className="row-center">
                            <p className="safety-card__location m-0">{u.title}</p>
                            {important && (
                              <span className="safety-chip tone-alert no-shrink">
                                <IconPin className="icon-inline" size={11} strokeWidth={2} />
                                Important
                              </span>
                            )}
                          </div>
                          <p className="safety-card__meta">
                            <IconCalendar className="icon-inline" size={12} strokeWidth={2} />
                            {u.topic} · {formatShortDate(u.publishedAt)}
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <p className="safety-card__description">{u.description}</p>
                  </Drawer>
                );
              })}
            </div>
          </section>
        </TabPanel>
      )}
    </div>
  );
}
