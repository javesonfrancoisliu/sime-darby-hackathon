import { useId, useState, type ReactNode } from "react";
import { useHashTab } from "../ui/useHashTab";
import { PlayIcon } from "../ui/PlayIcon";
import {
  useBadges,
  useChallenges,
  useContribute,
  useDailyCheckIn,
  usePoints,
  useRedeem,
  useRewards,
  useStreak,
} from "../hooks/useChallengesData";
import { formatDate, malaysiaToday } from "../requests/schedule";
import { useResident } from "../session/useResident";
import { IconTrophy, IconFlame, IconGift, IconSparkles, IconUsers, IconCheck } from "../ui/Icons";
import { SegmentedTabs, TabPanel, type TabItem } from "../ui/SegmentedTabs";
import { Drawer } from "../ui/Drawer";
import { PageHeaderActions } from "../ui/PageHeaderActions";
import { Leaderboard } from "../ui/Leaderboard";
import { useAccessibility } from "../context/AccessibilityContext";
import { Banner } from "../ui/Banner";
import { Spinner } from "../ui/Spinner";
import type { FriendlyError } from "../api/errors";

type PlayTab = "streak" | "challenges" | "badges" | "rewards";
export const PLAY_TABS: readonly PlayTab[] = ["streak", "challenges", "badges", "rewards"];

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// The last seven Malaysia dates ending today, oldest first.
function lastSevenDays(now: Date): string[] {
  return Array.from({ length: WEEK_DAYS }, (_, i) =>
    malaysiaToday(new Date(now.getTime() - (WEEK_DAYS - 1 - i) * DAY_MS)),
  );
}

function dayLetter(date: string): string {
  return DAY_LETTERS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? "";
}

// The server refuses a team goal when the profile area names none of the four precincts.
const NO_PRECINCT_TEXT =
  "Team goals need your neighbourhood to be Elmina West, Elmina Valley, Elmina East or Central Park. Please ask the community team to update your area.";

// Cheapest first, so the next reward within reach is at the top.
// For example "1 more point" or "3 more points".
const moreText = (n: number) => `${n} more ${n === 1 ? "point" : "points"}`;

const byCost = (a: { pointsCost: number }, b: { pointsCost: number }) =>
  a.pointsCost - b.pointsCost;

// Kinder words for the "already done" answer than the shared default.
function kindMessage(error: FriendlyError | undefined, alreadyDone: string, fallback: string) {
  if (!error) return fallback;
  if (error.code === "ALREADY_DONE") return alreadyDone;
  return error.message;
}

function Loadable({
  query,
  label,
  children,
}: {
  query: { status: string; data?: unknown; error?: FriendlyError; refetch: () => void };
  label: string;
  children: ReactNode;
}) {
  if (query.status === "loading" && query.data === undefined) return <Spinner label={label} />;
  if (query.status === "error" && query.data === undefined) {
    return (
      <Banner message={query.error?.message ?? "Something went wrong."} onRetry={query.refetch} />
    );
  }
  return <>{children}</>;
}

// Community Play: team goals for the neighbourhood, a daily check-in streak,
// participation badges and rewards. Everything comes from the township API.
export function ChallengesPage() {
  const resident = useResident();
  const { speak, voiceAssist, triggerHaptic } = useAccessibility();
  const neighbourhood = resident?.area ?? "Your neighbourhood";

  const challenges = useChallenges();
  const points = usePoints();
  const streak = useStreak();
  const rewards = useRewards();
  const badges = useBadges();
  const contribute = useContribute();
  const { checkIn, checkedInToday, run: runCheckIn } = useDailyCheckIn(streak, points);
  const redeem = useRedeem();

  const [tab, setTab] = useHashTab<PlayTab>(PLAY_TABS, "streak");
  const [toast, setToast] = useState("");
  const [openGoal, setOpenGoal] = useState<string | null>(null);
  const groupId = useId();
  const TABS: TabItem<PlayTab>[] = [
    { id: "streak", label: "Streak", icon: <IconFlame size={18} strokeWidth={2} /> },
    { id: "challenges", label: "Goals", icon: <IconTrophy size={18} strokeWidth={2} /> },
    { id: "badges", label: "Badges", icon: <IconSparkles size={18} strokeWidth={2} /> },
    { id: "rewards", label: "Rewards", icon: <IconGift size={18} strokeWidth={2} /> },
  ];

  const balance = points.data?.points;
  const week = lastSevenDays(new Date());
  const teamChallenges = (challenges.data ?? []).filter((c) => c.mode === "team");

  function setBalance(next: number) {
    points.update((p) => ({ ...p, points: next }));
  }

  async function handleCheckIn() {
    triggerHaptic(25);
    const result = await runCheckIn();
    if (!result) return;
    // Which rewards are locked depends on the balance, so load them again.
    rewards.refetch();
    setToast(`Nice! +${result.pointsAwarded} points`);
    window.setTimeout(() => setToast(""), 2200);
    if (voiceAssist) {
      speak(
        `Checked in. Your streak is now ${result.streak.current} days, with ${result.pointsAwarded} points added.`,
      );
    }
  }

  async function handleContribute(id: string) {
    triggerHaptic(20);
    const result = await contribute.run(id);
    if (!result) return;
    challenges.update((list) =>
      list.map((c) => (c.id === id ? { ...c, teamProgress: result.teamProgress } : c)),
    );
    if (result.pointsAwarded > 0) {
      points.update((p) => ({ ...p, points: p.points + result.pointsAwarded }));
      rewards.refetch();
    }
    setToast(`Thank you! +${result.pointsAwarded} points for ${neighbourhood}`);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function handleRedeem(id: string, title: string) {
    triggerHaptic(20);
    const result = await redeem.run(id);
    if (!result) return;
    setBalance(result.points);
    rewards.update((list) =>
      list.map((r) =>
        r.id === id ? { ...r, status: "redeemed", redeemedAt: result.redemption.redeemedAt } : r,
      ),
    );
    rewards.refetch();
    if (voiceAssist) speak(`Redeemed: ${title}.`);
  }

  function handleReadSummary() {
    const earned = (badges.data ?? []).filter((b) => b.earned).length;
    speak(
      `Community play for ${neighbourhood}. You have ${balance ?? 0} points and a ${streak.data?.current ?? 0} day check-in streak. ${earned} badges earned. Join a neighbourhood challenge or redeem a reward.`,
    );
  }

  return (
    <div className="safety-page">
      <div className="safety-page__header">
        <div className="row-between play-header-row">
          <div>
            <h1 className="safety-page__title">Community Play</h1>
            <p className="safety-page__subtitle">
              <IconUsers className="icon-inline-low" size={13} strokeWidth={2} />
              {neighbourhood}
            </p>
          </div>
          <div className="row-center">
            {balance !== undefined ? (
              <span className="play-header-points" aria-label={`${balance} neighbour points`}>
                <IconSparkles size={15} strokeWidth={2} aria-hidden="true" />
                {balance}
              </span>
            ) : null}
            <PageHeaderActions onReadAloud={handleReadSummary} />
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

      {toast ? (
        <p className="play-toast" role="status">
          {toast}
        </p>
      ) : null}

      {tab === "streak" && (
        <TabPanel id="streak" groupId={groupId}>
          <section className="safety-section seg-panel-enter" aria-label="Your points and streak">
            <Loadable query={streak} label="Loading your streak">
              <div className="play-summary">
                <div className="play-summary__points">
                  <span className="play-summary__points-icon" aria-hidden="true">
                    <IconSparkles size={22} strokeWidth={1.8} />
                  </span>
                  <div>
                    <span className="play-summary__points-value">{balance ?? 0}</span>
                    <span className="play-summary__points-label">neighbour points</span>
                  </div>
                </div>
                <div
                  className="play-summary__streak"
                  aria-label={`Current streak ${streak.data?.current ?? 0} days`}
                >
                  <span className="play-summary__streak-flame" aria-hidden="true">
                    <IconFlame size={20} strokeWidth={1.8} />
                  </span>
                  <span className="play-summary__streak-value">{streak.data?.current ?? 0}</span>
                  <span className="play-summary__streak-label">day streak</span>
                </div>
              </div>

              <div
                className="play-week"
                role="img"
                aria-label={`Checked in ${week.filter((d) => streak.data?.recent?.includes(d)).length} of the last 7 days`}
              >
                {week.map((day) => {
                  const done = streak.data?.recent?.includes(day) ?? false;
                  return (
                    <div key={day} className="play-week__day">
                      <span
                        className={`play-week__dot${done ? " play-week__dot--done" : ""}`}
                        aria-hidden="true"
                      >
                        {done ? <IconCheck size={14} strokeWidth={2.6} /> : null}
                      </span>
                      <span className="play-week__label">{dayLetter(day)}</span>
                    </div>
                  );
                })}
              </div>

              {checkIn.status === "error" ? (
                <Banner
                  message={kindMessage(
                    checkIn.error,
                    "You have already checked in today. Come back tomorrow.",
                    "We could not check you in.",
                  )}
                  onRetry={checkIn.error?.code === "ALREADY_DONE" ? streak.refetch : undefined}
                  retryLabel="Refresh"
                />
              ) : null}

              <button
                type="button"
                className={`ui-button ui-button--primary play-checkin-btn${checkedInToday ? " play-checkin-btn--done" : ""}`}
                onClick={() => void handleCheckIn()}
                disabled={checkedInToday || checkIn.status === "loading"}
                aria-pressed={checkedInToday}
              >
                {checkedInToday ? (
                  <>
                    <IconCheck size={18} strokeWidth={2.4} aria-hidden="true" />
                    You are okay today
                  </>
                ) : (
                  "I’m Okay!"
                )}
              </button>

              <Leaderboard myPoints={balance ?? 0} myName={resident?.name ?? ""} />
            </Loadable>
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
              We reach these goals <strong>together</strong> - every neighbour&rsquo;s part counts.
            </p>
            <Loadable query={challenges} label="Loading challenges">
              {contribute.status === "error" ? (
                <Banner
                  message={
                    contribute.error?.code === "VALIDATION_FAILED"
                      ? NO_PRECINCT_TEXT
                      : kindMessage(
                          contribute.error,
                          "You have already added your part today. Come back tomorrow.",
                          "We could not add your part.",
                        )
                  }
                />
              ) : null}
              {challenges.data && teamChallenges.length === 0 ? (
                <p className="ui-page-subtitle">No neighbourhood challenges are running yet.</p>
              ) : null}
              <div className="ui-stack">
                {teamChallenges.map((c) => {
                  const progress = c.teamProgress?.current ?? 0;
                  const goal = c.goal.target;
                  const pct = Math.min(Math.round((progress / goal) * 100), 100);
                  const done = progress >= goal;
                  return (
                    <Drawer
                      key={c.id}
                      className="play-challenge play-challenge--drawer"
                      label={c.title}
                      open={openGoal === c.id}
                      onToggle={() => {
                        triggerHaptic(10);
                        setOpenGoal((cur) => (cur === c.id ? null : c.id));
                      }}
                      header={
                        <>
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
                        </>
                      }
                    >
                      <div className="play-challenge__meta">
                        <span className="play-challenge__count">
                          {progress} / {goal} {c.goal.unit}
                        </span>
                        <span className="play-challenge__ends">
                          {c.ended ? "Ended" : "Ends"} {formatDate(c.endsOn)}
                        </span>
                      </div>
                      {c.teamReward ? (
                        <p className="play-challenge__reward">
                          <IconGift className="icon-inline-low" size={14} strokeWidth={2} />
                          Team reward: {c.teamReward}
                        </p>
                      ) : null}
                      {!c.ended ? (
                        <button
                          type="button"
                          className="ui-button ui-button--primary play-checkin-btn"
                          disabled={contribute.status === "loading"}
                          onClick={() => void handleContribute(c.id)}
                        >
                          Add my part today
                        </button>
                      ) : null}
                    </Drawer>
                  );
                })}
              </div>
            </Loadable>
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
            <Loadable query={badges} label="Loading badges">
              {badges.data && badges.data.length === 0 ? (
                <p className="ui-page-subtitle">No badges are available yet.</p>
              ) : null}
              <div className="play-badges">
                {(badges.data ?? []).map((b) => (
                  <div key={b.id} className={`play-badge${b.earned ? " play-badge--earned" : ""}`}>
                    <PlayIcon name={b.icon} className="play-badge__icon" />
                    <span className="play-badge__name">{b.title}</span>
                    <span className="play-badge__desc">{b.description}</span>
                    {!b.earned && <span className="play-badge__locked">Locked</span>}
                  </div>
                ))}
              </div>
            </Loadable>
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
            <Loadable query={rewards} label="Loading rewards">
              {redeem.status === "error" ? (
                <Banner
                  message={kindMessage(
                    redeem.error,
                    "You have already redeemed this reward.",
                    "We could not redeem that reward.",
                  )}
                />
              ) : null}
              {rewards.data && rewards.data.length === 0 ? (
                <p className="ui-page-subtitle">No rewards are available yet.</p>
              ) : null}
              <div className="ui-stack">
                {[...(rewards.data ?? [])].sort(byCost).map((r) => {
                  const isRedeemed = r.status === "redeemed";
                  const locked = r.status === "locked";
                  const affordable = (balance ?? 0) >= r.pointsCost;
                  return (
                    <div key={r.id} className="play-reward">
                      <PlayIcon name={r.icon} className="play-reward__icon" />
                      <div className="play-reward__body">
                        <p className="play-reward__title">{r.title}</p>
                        {r.partner ? <p className="play-reward__partner">{r.partner}</p> : null}
                        {!isRedeemed && !affordable ? (
                          <p className="play-reward__partner">
                            {moreText(r.pointsCost - (balance ?? 0))} to unlock
                          </p>
                        ) : null}
                      </div>
                      <div className="play-reward__action">
                        <span className="play-reward__cost">{r.pointsCost} pts</span>
                        <button
                          type="button"
                          className={`community-register-btn${isRedeemed ? " community-register-btn--done" : ""}`}
                          onClick={() => void handleRedeem(r.id, r.title)}
                          disabled={
                            isRedeemed || locked || !affordable || redeem.status === "loading"
                          }
                          aria-pressed={isRedeemed}
                        >
                          {isRedeemed ? (
                            <>
                              <IconCheck size={15} strokeWidth={2.4} aria-hidden="true" />
                              Redeemed
                            </>
                          ) : locked ? (
                            "Locked"
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
            </Loadable>
          </section>
        </TabPanel>
      )}
    </div>
  );
}
