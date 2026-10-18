import { useId, useState, type ReactNode } from "react";
import { EVENT_CATEGORY_TEXT, spotsLeft } from "../community/events";
import { useEvents, useJoinEvent } from "../hooks/useEvents";
import { formatWhen } from "../requests/schedule";
import { useResident } from "../session/useResident";
import { Banner } from "../ui/Banner";
import { DemoTag } from "../ui/DemoTag";
import { Spinner } from "../ui/Spinner";
import { useCommunityContent } from "../hooks/useCommunityContent";
import {
  IconCalendar,
  IconAlertTriangle,
  IconHeartHandshake,
  IconBell,
  IconMapPin,
  IconClock,
  IconPin,
  IconUsers,
  IconVolume2,
  IconCheck,
} from "../ui/Icons";
import { SegmentedTabs, TabPanel } from "../ui/SegmentedTabs";
import { useAccessibility } from "../context/AccessibilityContext";

type CommunityTab = "events" | "maintenance" | "volunteer" | "updates";

// Shared section heading with standardized outline icon
function SectionHeading({
  icon,
  title,
  demo = false,
}: {
  icon: ReactNode;
  title: string;
  demo?: boolean;
}) {
  return (
    <div className="safety-section__heading">
      <span className="safety-section__heading-icon" aria-hidden="true">
        {icon}
      </span>
      <h2 className="safety-section__heading-text">
        {title}
        {demo ? <DemoTag /> : null}
      </h2>
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
  const { maintenanceNotices, volunteerOpportunities, townshipUpdates } = useCommunityContent();
  const { speak, voiceAssist, triggerHaptic } = useAccessibility();
  const [tab, setTab] = useState<CommunityTab>("events");
  const groupId = useId();

  const resident = useResident();
  const events = useEvents();
  const join = useJoinEvent();
  const [joinedVolunteer, setJoinedVolunteer] = useState<Set<string>>(new Set());

  const upcoming = (events.data ?? []).filter((e) => e.status === "upcoming");

  async function joinEvent(id: string, title: string) {
    triggerHaptic(18);
    const updated = await join.run(id);
    if (!updated) return;
    events.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
    if (voiceAssist) speak(`You are registered for ${title}.`);
  }

  function toggleVolunteer(id: string, title: string) {
    triggerHaptic(18);
    setJoinedVolunteer((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (voiceAssist) speak(`Thank you for signing up to help with ${title}.`);
      }
      return next;
    });
  }

  const TABS = [
    { id: "events", label: "Events", icon: <IconCalendar size={18} strokeWidth={2} /> },
    { id: "maintenance", label: "Notices", icon: <IconAlertTriangle size={18} strokeWidth={2} /> },
    { id: "volunteer", label: "Volunteer", icon: <IconHeartHandshake size={18} strokeWidth={2} /> },
    { id: "updates", label: "Updates", icon: <IconBell size={18} strokeWidth={2} /> },
  ];

  function handleReadCommunitySummary() {
    const place = resident?.area ?? "your township";
    speak(
      `Township community updates for ${place}. ${upcoming.length} upcoming ${upcoming.length === 1 ? "event" : "events"}. The notices, volunteering and updates tabs show demo data.`,
    );
  }

  return (
    <div className="safety-page">
      <div className="safety-page__header">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1 className="safety-page__title">Community</h1>
            <p className="safety-page__subtitle">
              {resident?.area ?? "Elmina"} · Centralised Township Info
            </p>
          </div>
          <button
            type="button"
            className="ui-button ui-button--ghost apple-header-voice-btn"
            onClick={handleReadCommunitySummary}
            aria-label="Read community announcements aloud"
            title="Read summary aloud"
          >
            <IconVolume2 size={18} strokeWidth={2.2} />
            <span className="apple-header-voice-text">Listen</span>
          </button>
        </div>
      </div>

      <SegmentedTabs
        tabs={TABS}
        active={tab}
        onChange={(id) => setTab(id as CommunityTab)}
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
                      <div style={{ flex: 1 }}>
                        <p className="safety-card__location">{e.title}</p>
                        <p className="safety-card__meta">
                          <IconClock
                            size={12}
                            strokeWidth={2}
                            style={{ verticalAlign: "-1px", marginRight: 4 }}
                          />
                          {formatWhen(e.startsAt)}
                        </p>
                        <p className="safety-card__meta">
                          <IconMapPin
                            size={12}
                            strokeWidth={2}
                            style={{ verticalAlign: "-1px", marginRight: 4 }}
                          />
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
                            You have a spot · <strong>{spots}</strong> left
                          </>
                        ) : spots === 0 ? (
                          <>This event is full</>
                        ) : (
                          <>
                            Only <strong>{spots}</strong> spots left
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        className={`community-register-btn${e.joined ? " community-register-btn--done" : ""}`}
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
              demo
            />
            <div className="ui-stack">
              {maintenanceNotices.map((m) => (
                <div key={m.id} className="safety-card">
                  <div className="safety-card__row">
                    <div className="community-event-card__icon" aria-hidden="true">
                      <IconAlertTriangle size={24} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="safety-card__location">{m.title}</p>
                      <p className="safety-card__meta">
                        <IconMapPin
                          size={12}
                          strokeWidth={2}
                          style={{ verticalAlign: "-1px", marginRight: 4 }}
                        />
                        {m.affectedArea}
                      </p>
                      <p className="safety-card__meta">
                        <IconCalendar
                          size={12}
                          strokeWidth={2}
                          style={{ verticalAlign: "-1px", marginRight: 4 }}
                        />
                        {m.dateRange}
                      </p>
                    </div>
                  </div>
                  <p className="safety-card__description">{m.impact}</p>
                </div>
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
              demo
            />
            <div className="ui-stack">
              {volunteerOpportunities.map((v) => {
                const joined = joinedVolunteer.has(v.id);
                const signedUp = joined ? v.volunteersSignedUp + 1 : v.volunteersSignedUp;
                const pct = Math.min(Math.round((signedUp / v.volunteersNeeded) * 100), 100);
                return (
                  <div key={v.id} className="safety-card">
                    <div className="safety-card__row">
                      <div className="community-event-card__icon" aria-hidden="true">
                        <IconUsers size={24} strokeWidth={1.8} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className="safety-card__location">{v.title}</p>
                        <p className="safety-card__meta">
                          <IconCalendar
                            size={12}
                            strokeWidth={2}
                            style={{ verticalAlign: "-1px", marginRight: 4 }}
                          />
                          {v.date} · {v.duration}
                        </p>
                        <p className="safety-card__meta">
                          <IconMapPin
                            size={12}
                            strokeWidth={2}
                            style={{ verticalAlign: "-1px", marginRight: 4 }}
                          />
                          {v.location}
                        </p>
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
                        {signedUp} / {v.volunteersNeeded} volunteers signed up
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`community-register-btn community-register-btn--full${joined ? " community-register-btn--done" : ""}`}
                      aria-pressed={joined}
                      onClick={() => toggleVolunteer(v.id, v.title)}
                    >
                      {joined ? (
                        <>
                          <IconCheck size={18} strokeWidth={2.4} aria-hidden="true" />
                          You&rsquo;re signed up
                        </>
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
              demo
            />
            <div className="ui-stack">
              {townshipUpdates.map((u) => (
                <div key={u.id} className={`safety-card${u.pinned ? " safety-card--pinned" : ""}`}>
                  <div className="safety-card__row">
                    <div className="community-event-card__icon" aria-hidden="true">
                      <IconBell size={24} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p className="safety-card__location" style={{ margin: 0 }}>
                          {u.title}
                        </p>
                        {u.pinned && (
                          <span
                            className="safety-chip"
                            style={{ background: "#FEE2E2", color: "#991B1B", flexShrink: 0 }}
                          >
                            <IconPin
                              size={11}
                              strokeWidth={2}
                              style={{ verticalAlign: "-1px", marginRight: 3 }}
                            />
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="safety-card__meta">
                        <IconCalendar
                          size={12}
                          strokeWidth={2}
                          style={{ verticalAlign: "-1px", marginRight: 4 }}
                        />
                        {u.category} · {u.date}
                      </p>
                    </div>
                  </div>
                  <p className="safety-card__description">{u.body}</p>
                </div>
              ))}
            </div>
          </section>
        </TabPanel>
      )}
    </div>
  );
}
