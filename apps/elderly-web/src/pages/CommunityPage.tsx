import { useId, useState, type ReactNode } from "react";
import {
  COMMUNITY_EVENTS,
  MAINTENANCE_ANNOUNCEMENTS,
  VOLUNTEER_OPPORTUNITIES,
  TOWNSHIP_UPDATES,
} from "../mock/communityData";
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

/** Shared section heading with standardized outline icon */
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

/**
 * Centralised Neighbourhood Information page with standardized monochrome outline icons.
 * Sections:
 * a. Community activities and upcoming events
 * b. Facility maintenance announcements
 * c. Community volunteering opportunities
 * d. Important township updates
 */
export function CommunityPage() {
  const { speak, voiceAssist, triggerHaptic } = useAccessibility();
  const [tab, setTab] = useState<CommunityTab>("events");
  const groupId = useId();

  // Stateful demo interactions (apple-design §13 feedback on the causal event).
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [joinedVolunteer, setJoinedVolunteer] = useState<Set<string>>(new Set());

  function toggleEvent(id: string, title: string) {
    triggerHaptic(18);
    setRegisteredEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (voiceAssist) speak(`You are registered for ${title}.`);
      }
      return next;
    });
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
    speak(
      "Township community updates for Elmina West. 4 upcoming events including Morning Yoga and Elmina Farmers' Market. 3 facility maintenance notices regarding water and road works. 3 volunteering opportunities available for neighbourhood youth.",
    );
  }

  return (
    <div className="safety-page">
      <div className="safety-page__header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 className="safety-page__title">Community</h1>
            <p className="safety-page__subtitle">Elmina West · Centralised Township Info</p>
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

      {/* ── Segmented tabs: one category at a time ─────────── */}
      <SegmentedTabs
        tabs={TABS}
        active={tab}
        onChange={(id) => setTab(id as CommunityTab)}
        ariaLabel="Choose a community category"
      />

      {/* ── 1. Community Activities & Events ──────────────── */}
      {tab === "events" && (
      <TabPanel id="events" groupId={groupId}>
      <section className="safety-section seg-panel-enter" id="events" aria-label="Community events">
        <SectionHeading
          icon={<IconCalendar size={22} strokeWidth={1.8} />}
          title="Activities &amp; Upcoming Events"
        />
        <div className="ui-stack">
          {COMMUNITY_EVENTS.map((e) => (
            <div key={e.id} className="safety-card community-event-card">
              <div className="safety-card__row">
                <div className="community-event-card__icon" aria-hidden="true">
                  <IconCalendar size={24} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="safety-card__location">{e.title}</p>
                  <p className="safety-card__meta">
                    <IconClock size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                    {e.date} · {e.time}
                  </p>
                  <p className="safety-card__meta">
                    <IconMapPin size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                    {e.location}
                  </p>
                </div>
                <span className="community-category-chip">{e.category}</span>
              </div>
              {e.spotsLeft !== undefined && (() => {
                const registered = registeredEvents.has(e.id);
                const spots = registered ? e.spotsLeft - 1 : e.spotsLeft;
                return (
                  <div className="community-spots">
                    <span className="community-spots__text">
                      {registered ? (
                        <>You have a spot · <strong>{spots}</strong> left</>
                      ) : (
                        <>Only <strong>{spots}</strong> spots left</>
                      )}
                    </span>
                    <button
                      type="button"
                      className={`community-register-btn${registered ? " community-register-btn--done" : ""}`}
                      aria-pressed={registered}
                      onClick={() => toggleEvent(e.id, e.title)}
                    >
                      {registered ? (
                        <>
                          <IconCheck size={16} strokeWidth={2.4} aria-hidden="true" />
                          Registered
                        </>
                      ) : (
                        "Register"
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </section>
      </TabPanel>
      )}

      {/* ── 2. Facility Maintenance Announcements ─────────── */}
      {tab === "maintenance" && (
      <TabPanel id="maintenance" groupId={groupId}>
      <section className="safety-section seg-panel-enter" id="maintenance" aria-label="Maintenance announcements">
        <SectionHeading
          icon={<IconAlertTriangle size={22} strokeWidth={1.8} />}
          title="Facility Maintenance Announcements"
        />
        <div className="ui-stack">
          {MAINTENANCE_ANNOUNCEMENTS.map((m) => (
            <div key={m.id} className="safety-card">
              <div className="safety-card__row">
                <div className="community-event-card__icon" aria-hidden="true">
                  <IconAlertTriangle size={24} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="safety-card__location">{m.title}</p>
                  <p className="safety-card__meta">
                    <IconMapPin size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                    {m.affectedArea}
                  </p>
                  <p className="safety-card__meta">
                    <IconCalendar size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
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

      {/* ── 3. Community Volunteering Opportunities ────────── */}
      {tab === "volunteer" && (
      <TabPanel id="volunteer" groupId={groupId}>
      <section className="safety-section seg-panel-enter" id="volunteer" aria-label="Volunteering opportunities">
        <SectionHeading
          icon={<IconHeartHandshake size={22} strokeWidth={1.8} />}
          title="Community Volunteering Opportunities"
        />
        <div className="ui-stack">
          {VOLUNTEER_OPPORTUNITIES.map((v) => {
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
                      <IconCalendar size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                      {v.date} · {v.duration}
                    </p>
                    <p className="safety-card__meta">
                      <IconMapPin size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                      {v.location}
                    </p>
                  </div>
                </div>
                {/* Progress bar for volunteer sign-ups */}
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

      {/* ── 4. Important Township Updates ─────────────────── */}
      {tab === "updates" && (
      <TabPanel id="updates" groupId={groupId}>
      <section className="safety-section seg-panel-enter" id="updates" aria-label="Township updates">
        <SectionHeading
          icon={<IconBell size={22} strokeWidth={1.8} />}
          title="Important Township Updates"
        />
        <div className="ui-stack">
          {TOWNSHIP_UPDATES.map((u) => (
            <div key={u.id} className={`safety-card${u.pinned ? " safety-card--pinned" : ""}`}>
              <div className="safety-card__row">
                <div className="community-event-card__icon" aria-hidden="true">
                  <IconBell size={24} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p className="safety-card__location" style={{ margin: 0 }}>{u.title}</p>
                    {u.pinned && (
                      <span className="safety-chip" style={{ background: "#FEE2E2", color: "#991B1B", flexShrink: 0 }}>
                        <IconPin size={11} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 3 }} />
                        Pinned
                      </span>
                    )}
                  </div>
                  <p className="safety-card__meta">
                    <IconCalendar size={12} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
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
