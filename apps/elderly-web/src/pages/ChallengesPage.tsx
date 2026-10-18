import { useId, useState } from "react";
import { PlayIcon } from "../ui/PlayIcon";
import { useChallengesData } from "../hooks/useChallengesData";
import type { StreakState } from "../types/challenges";
import {
  IconTrophy,
  IconFlame,
  IconGift,
  IconSparkles,
  IconUsers,
  IconCheck,
  IconVolume2,
} from "../ui/Icons";
import { SegmentedTabs, TabPanel, type TabItem } from "../ui/SegmentedTabs";
import { useAccessibility } from "../context/AccessibilityContext";
import { DemoTag } from "../ui/DemoTag";

type PlayTab = "streak" | "challenges" | "badges" | "rewards";

// Challenges - gamified community features for the Silver Generation (FOR FUN).
// Team/neighbourhood goals (never individual rankings), participation badges &
// a daily check-in streak, and rewards/vouchers for township shops & clinics.
// Stateful demo: nothing here is saved or granted, so the page says so.
export function ChallengesPage() {
  const {
    neighbourhood,
    communityChallenges,
    badgeList,
    rewardList,
    initialStreak,
    initialPoints,
  } = useChallengesData();
  const { speak, voiceAssist, triggerHaptic } = useAccessibility();

  const [tab, setTab] = useState<PlayTab>("streak");
  const groupId = useId();
  const TABS: TabItem<PlayTab>[] = [
    { id: "streak", label: "Streak", icon: <IconFlame size={18} strokeWidth={2} /> },
    { id: "challenges", label: "Goals", icon: <IconTrophy size={18} strokeWidth={2} /> },
    { id: "badges", label: "Badges", icon: <IconSparkles size={18} strokeWidth={2} /> },
    { id: "rewards", label: "Rewards", icon: <IconGift size={18} strokeWidth={2} /> },
  ];

  const [points, setPoints] = useState(initialPoints);
  const [streak, setStreak] = useState<StreakState>(initialStreak);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [challengeBoost, setChallengeBoost] = useState<Record<string, number>>({});
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());
  const [justEarnedBadge, setJustEarnedBadge] = useState(false);

  const firstChallenge = communityChallenges[0];

  function handleCheckIn() {
    if (checkedInToday) return;
    triggerHaptic(25);
    setCheckedInToday(true);
    setStreak((s) => ({
      current: s.current + 1,
      best: Math.max(s.best, s.current + 1),
      week: [...s.week.slice(1), true],
    }));
    setPoints((p) => p + 10);
    // Today's check-in adds to our neighbourhood's shared walk goal.
    if (firstChallenge) {
      setChallengeBoost((b) => ({ ...b, [firstChallenge.id]: (b[firstChallenge.id] ?? 0) + 1 }));
    }
    setJustEarnedBadge(true);
    window.setTimeout(() => setJustEarnedBadge(false), 2200);
    if (voiceAssist) {
      speak(
        `Checked in for the demo. The example streak is now ${streak.current + 1} days, with 10 example points added.`,
      );
    }
  }

  function handleRedeem(id: string, cost: number, title: string, partner: string) {
    if (redeemed.has(id) || points < cost) return;
    triggerHaptic(20);
    setPoints((p) => p - cost);
    setRedeemed((prev) => new Set(prev).add(id));
    if (voiceAssist)
      speak(`Example voucher redeemed: ${title} at ${partner}. Nothing real was spent.`);
  }

  function handleReadSummary() {
    const earned = badgeList.filter((b) => b.earned).length + (justEarnedBadge ? 0 : 0);
    speak(
      `Community play for ${neighbourhood.name}. These are example values, not real points. The demo shows ${points} points and a ${streak.current} day check-in streak. ${earned} badges earned. Join a neighbourhood challenge or redeem a reward at a township shop or clinic.`,
    );
  }

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="safety-page">
      <div className="safety-page__header">
        <div className="row-between">
          <div>
            <h1 className="safety-page__title">
              Community Play
              <DemoTag />
            </h1>
            <p className="safety-page__subtitle">
              <IconUsers className="icon-inline-low" size={13} strokeWidth={2} />
              {neighbourhood.name} · {neighbourhood.members} neighbours
            </p>
          </div>
          <div className="row-center">
            <span className="play-header-points" aria-label={`${points} neighbour points`}>
              <IconSparkles size={15} strokeWidth={2} aria-hidden="true" />
              {points}
            </span>
            <button
              type="button"
              className="ui-button ui-button--ghost apple-header-voice-btn"
              onClick={handleReadSummary}
              aria-label="Read your rewards and streak summary aloud"
              title="Read summary aloud"
            >
              <IconVolume2 size={18} strokeWidth={2.2} />
              <span className="apple-header-voice-text">Listen</span>
            </button>
          </div>
        </div>
      </div>

      <SegmentedTabs
        groupId={groupId}
        tabs={TABS}
        active={tab}
        onChange={setTab}
        ariaLabel="Choose a community play area"
      />

      {tab === "streak" && (
        <TabPanel id="streak" groupId={groupId}>
          <section className="safety-section seg-panel-enter" aria-label="Your points and streak">
            <div className="play-summary">
              <div className="play-summary__points">
                <span className="play-summary__points-icon" aria-hidden="true">
                  <IconSparkles size={22} strokeWidth={1.8} />
                </span>
                <div>
                  <span className="play-summary__points-value">{points}</span>
                  <span className="play-summary__points-label">
                    neighbour points <DemoTag />
                  </span>
                </div>
              </div>
              <div
                className="play-summary__streak"
                aria-label={`Current streak ${streak.current} days`}
              >
                <span className="play-summary__streak-flame" aria-hidden="true">
                  <IconFlame size={20} strokeWidth={1.8} />
                </span>
                <span className="play-summary__streak-value">{streak.current}</span>
                <span className="play-summary__streak-label">day streak</span>
              </div>
            </div>

            <div
              className="play-week"
              role="img"
              aria-label={`Checked in ${streak.week.filter(Boolean).length} of the last 7 days`}
            >
              {streak.week.map((done, i) => (
                <div key={i} className="play-week__day">
                  <span
                    className={`play-week__dot${done ? " play-week__dot--done" : ""}`}
                    aria-hidden="true"
                  >
                    {done ? <IconCheck size={14} strokeWidth={2.6} /> : null}
                  </span>
                  <span className="play-week__label">{dayLabels[i]}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={`ui-button ui-button--primary play-checkin-btn${checkedInToday ? " play-checkin-btn--done" : ""}`}
              onClick={handleCheckIn}
              disabled={checkedInToday}
              aria-pressed={checkedInToday}
            >
              {checkedInToday ? (
                <>
                  <IconCheck size={18} strokeWidth={2.4} aria-hidden="true" />
                  Checked in today · +10
                </>
              ) : (
                "Check in today"
              )}
            </button>
            {justEarnedBadge && (
              <p className="play-toast" role="status">
                Nice! +10 points added to {neighbourhood.name}
              </p>
            )}
          </section>
        </TabPanel>
      )}

      {tab === "challenges" && (
        <TabPanel id="challenges" groupId={groupId}>
          <section className="safety-section seg-panel-enter" aria-label="Neighbourhood challenges">
            <div className="safety-section__heading">
              <span className="safety-section__heading-icon" aria-hidden="true">
                <IconTrophy size={22} strokeWidth={1.8} />
              </span>
              <h2 className="safety-section__heading-text">Neighbourhood Challenges</h2>
            </div>
            <p className="play-section-note">
              We reach these goals <strong>together</strong> - every neighbour&rsquo;s check-in
              counts.
            </p>
            <div className="ui-stack">
              {communityChallenges.map((c) => {
                const boost = challengeBoost[c.id] ?? 0;
                const progress = Math.min(c.progress + boost, c.goal);
                const pct = Math.min(Math.round((progress / c.goal) * 100), 100);
                const done = progress >= c.goal;
                return (
                  <div key={c.id} className="play-challenge">
                    <div className="play-challenge__top">
                      <PlayIcon name={c.icon} className="play-challenge__icon" />
                      <div className="flex-fill">
                        <p className="play-challenge__title">{c.title}</p>
                        <p className="play-challenge__desc">{c.description}</p>
                      </div>
                    </div>
                    <div className="safety-bar play-challenge__bar">
                      <div
                        className="safety-bar__fill"
                        style={{
                          width: `${pct}%`,
                          background: done ? "var(--success)" : "var(--brand-primary)",
                        }}
                      />
                    </div>
                    <div className="play-challenge__meta">
                      <span className="play-challenge__count">
                        {progress} / {c.goal} {c.unit}
                      </span>
                      <span className="play-challenge__ends">Ends {c.endsOn}</span>
                    </div>
                    <p className="play-challenge__reward">
                      <IconGift className="icon-inline-low" size={14} strokeWidth={2} />
                      Team reward: {c.teamReward}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </TabPanel>
      )}

      {tab === "badges" && (
        <TabPanel id="badges" groupId={groupId}>
          <section className="safety-section seg-panel-enter" aria-label="Your badges">
            <div className="safety-section__heading">
              <span className="safety-section__heading-icon" aria-hidden="true">
                <IconSparkles size={22} strokeWidth={1.8} />
              </span>
              <h2 className="safety-section__heading-text">Participation Badges</h2>
            </div>
            <div className="play-badges">
              {badgeList.map((b) => (
                <div key={b.id} className={`play-badge${b.earned ? " play-badge--earned" : ""}`}>
                  <PlayIcon name={b.icon} className="play-badge__icon" />
                  <span className="play-badge__name">{b.name}</span>
                  <span className="play-badge__desc">{b.description}</span>
                  {!b.earned && <span className="play-badge__locked">Locked</span>}
                </div>
              ))}
            </div>
          </section>
        </TabPanel>
      )}

      {tab === "rewards" && (
        <TabPanel id="rewards" groupId={groupId}>
          <section className="safety-section seg-panel-enter" aria-label="Rewards and vouchers">
            <div className="safety-section__heading">
              <span className="safety-section__heading-icon" aria-hidden="true">
                <IconGift size={22} strokeWidth={1.8} />
              </span>
              <h2 className="safety-section__heading-text">Rewards &amp; Vouchers</h2>
              <DemoTag />
            </div>
            <p className="play-section-note">
              Example rewards. Redeeming here only changes this demo and gives nothing real.
            </p>
            <div className="ui-stack">
              {rewardList.map((r) => {
                const isRedeemed = redeemed.has(r.id);
                const affordable = points >= r.cost;
                return (
                  <div key={r.id} className="play-reward">
                    <PlayIcon name={r.icon} className="play-reward__icon" />
                    <div className="play-reward__body">
                      <p className="play-reward__title">{r.title}</p>
                      <p className="play-reward__partner">{r.partner}</p>
                    </div>
                    <div className="play-reward__action">
                      <span className="play-reward__cost">{r.cost} pts</span>
                      <button
                        type="button"
                        className={`community-register-btn${isRedeemed ? " community-register-btn--done" : ""}`}
                        onClick={() => handleRedeem(r.id, r.cost, r.title, r.partner)}
                        disabled={isRedeemed || !affordable}
                        aria-pressed={isRedeemed}
                      >
                        {isRedeemed ? (
                          <>
                            <IconCheck size={15} strokeWidth={2.4} aria-hidden="true" />
                            Redeemed
                          </>
                        ) : affordable ? (
                          "Redeem"
                        ) : (
                          "Not enough"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="safety-source">Demo rewards · Township partner offers are illustrative</p>
          </section>
        </TabPanel>
      )}
    </div>
  );
}
