import { useId, useState } from "react";
import {
  MY_NEIGHBOURHOOD,
  COMMUNITY_CHALLENGES,
  BADGES,
  INITIAL_STREAK,
  REWARDS,
  INITIAL_POINTS,
  type StreakState,
} from "../mock/challengesData";
import {
  IconTrophy,
  IconFlame,
  IconGift,
  IconSparkles,
  IconUsers,
  IconCheck,
  IconVolume2,
} from "../ui/Icons";
import { SegmentedTabs, TabPanel } from "../ui/SegmentedTabs";
import { useAccessibility } from "../context/AccessibilityContext";

type PlayTab = "streak" | "challenges" | "badges" | "rewards";

// Challenges - gamified community features for the Silver Generation (FOR FUN).
// Team/neighbourhood goals (never individual rankings), participation badges &
// a daily check-in streak, and rewards/vouchers for township shops & clinics.
// Stateful demo; apple-design feedback (§13 causal feedback, §16 completion).
export function ChallengesPage() {
  const { speak, voiceAssist, triggerHaptic } = useAccessibility();

  const [tab, setTab] = useState<PlayTab>("streak");
  const groupId = useId();
  const TABS = [
    { id: "streak", label: "Streak", icon: <IconFlame size={18} strokeWidth={2} /> },
    { id: "challenges", label: "Goals", icon: <IconTrophy size={18} strokeWidth={2} /> },
    { id: "badges", label: "Badges", icon: <IconSparkles size={18} strokeWidth={2} /> },
    { id: "rewards", label: "Rewards", icon: <IconGift size={18} strokeWidth={2} /> },
  ];

  const [points, setPoints] = useState(INITIAL_POINTS);
  const [streak, setStreak] = useState<StreakState>(INITIAL_STREAK);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [challengeBoost, setChallengeBoost] = useState<Record<string, number>>({});
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());
  const [justEarnedBadge, setJustEarnedBadge] = useState(false);

  const firstChallenge = COMMUNITY_CHALLENGES[0];

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
      speak(`Checked in. Your streak is now ${streak.current + 1} days. You earned 10 points for the neighbourhood.`);
    }
  }

  function handleRedeem(id: string, cost: number, title: string, partner: string) {
    if (redeemed.has(id) || points < cost) return;
    triggerHaptic(20);
    setPoints((p) => p - cost);
    setRedeemed((prev) => new Set(prev).add(id));
    if (voiceAssist) speak(`Voucher redeemed: ${title} at ${partner}.`);
  }

  function handleReadSummary() {
    const earned = BADGES.filter((b) => b.earned).length + (justEarnedBadge ? 0 : 0);
    speak(
      `Community play for ${MY_NEIGHBOURHOOD.name}. You have ${points} points and a ${streak.current} day check-in streak. ${earned} badges earned. Join a neighbourhood challenge or redeem a reward at a township shop or clinic.`,
    );
  }

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="safety-page">
      <div className="safety-page__header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 className="safety-page__title">Community Play</h1>
            <p className="safety-page__subtitle">
              <IconUsers size={13} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              {MY_NEIGHBOURHOOD.name} · {MY_NEIGHBOURHOOD.members} neighbours
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        tabs={TABS}
        active={tab}
        onChange={(id) => setTab(id as PlayTab)}
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
              <span className="play-summary__points-label">neighbour points</span>
            </div>
          </div>
          <div className="play-summary__streak" aria-label={`Current streak ${streak.current} days`}>
            <span className="play-summary__streak-flame" aria-hidden="true">
              <IconFlame size={20} strokeWidth={1.8} />
            </span>
            <span className="play-summary__streak-value">{streak.current}</span>
            <span className="play-summary__streak-label">day streak</span>
          </div>
        </div>

        <div className="play-week" role="img" aria-label={`Checked in ${streak.week.filter(Boolean).length} of the last 7 days`}>
          {streak.week.map((done, i) => (
            <div key={i} className="play-week__day">
              <span className={`play-week__dot${done ? " play-week__dot--done" : ""}`} aria-hidden="true">
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
            🎉 Nice! +10 points added to {MY_NEIGHBOURHOOD.name}
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
          We reach these goals <strong>together</strong> - every neighbour&rsquo;s check-in counts.
        </p>
        <div className="ui-stack">
          {COMMUNITY_CHALLENGES.map((c) => {
            const boost = challengeBoost[c.id] ?? 0;
            const progress = Math.min(c.progress + boost, c.goal);
            const pct = Math.min(Math.round((progress / c.goal) * 100), 100);
            const done = progress >= c.goal;
            return (
              <div key={c.id} className="play-challenge">
                <div className="play-challenge__top">
                  <span className="play-challenge__emoji" aria-hidden="true">{c.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p className="play-challenge__title">{c.title}</p>
                    <p className="play-challenge__desc">{c.description}</p>
                  </div>
                </div>
                <div className="safety-bar play-challenge__bar">
                  <div
                    className="safety-bar__fill"
                    style={{ width: `${pct}%`, background: done ? "var(--success)" : "var(--brand-primary)" }}
                  />
                </div>
                <div className="play-challenge__meta">
                  <span className="play-challenge__count">
                    {progress} / {c.goal} {c.unit}
                  </span>
                  <span className="play-challenge__ends">Ends {c.endsOn}</span>
                </div>
                <p className="play-challenge__reward">
                  <IconGift size={14} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 5 }} />
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
          {BADGES.map((b) => (
            <div key={b.id} className={`play-badge${b.earned ? " play-badge--earned" : ""}`}>
              <span className="play-badge__emoji" aria-hidden="true">{b.emoji}</span>
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
        </div>
        <p className="play-section-note">Use your neighbour points at township shops &amp; clinics.</p>
        <div className="ui-stack">
          {REWARDS.map((r) => {
            const isRedeemed = redeemed.has(r.id);
            const affordable = points >= r.cost;
            return (
              <div key={r.id} className="play-reward">
                <span className="play-reward__emoji" aria-hidden="true">{r.emoji}</span>
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
