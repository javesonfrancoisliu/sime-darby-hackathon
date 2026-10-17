import { useMemo, useState } from "react";

import {
  ChallengeCard,
  ChallengeStatsStrip,
  Leaderboard,
  LogProgressModal,
  QuizModal,
  RewardsPanel,
} from "../../components/challenges";
import { ConfirmationDialog, PageHeader, Pill } from "../../components/ui";
import { useGamification } from "../../data/useGamification";
import { MOCK_ECO_QUIZ } from "../../data/gamification.mock";
import {
  CHALLENGE_CATEGORY_LABEL,
  type Challenge,
  type ChallengeCategory,
} from "../../types/gamification";

type Tab = "challenges" | "leaderboard" | "rewards";
type CategoryFilter = "all" | ChallengeCategory;

const TABS: { id: Tab; label: string }[] = [
  { id: "challenges", label: "Challenges" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "rewards", label: "Rewards" },
];

const CATEGORY_FILTERS: CategoryFilter[] = ["all", "fitness", "cleanup", "environment"];

// The quiz challenge in the mock; its action opens the quiz instead of log-progress.
const QUIZ_CHALLENGE_ID = "chl-eco-quiz";
const QUIZ_ID = "eco-quiz-v1";

export function ChallengesPage() {
  const {
    challenges,
    progress,
    summary,
    leaderboard,
    badges,
    achievements,
    rewards,
    join,
    setProgress,
    requestCompletion,
    verifyCompletion,
    awardQuiz,
    redeem,
  } = useGamification();

  const [tab, setTab] = useState<Tab>("challenges");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [logging, setLogging] = useState<Challenge | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string } | null>(
    null,
  );

  const quizChallenge = challenges.find((c) => c.id === QUIZ_CHALLENGE_ID);
  const quizAlreadyEarned = progress[QUIZ_CHALLENGE_ID]?.status === "completed";

  const visible = useMemo(
    () =>
      category === "all"
        ? challenges
        : challenges.filter((c) => c.category === category),
    [challenges, category],
  );

  function handleJoin(challenge: Challenge) {
    join(challenge.id);
    setConfirmation({
      title: "Challenge joined",
      message: `You joined "${challenge.title}". Log your progress as you go — points are only awarded once completion is verified. Demo only.`,
    });
  }

  function handleLogProgress(challenge: Challenge) {
    // The environmental quiz uses the quiz flow rather than manual progress.
    if (challenge.id === QUIZ_CHALLENGE_ID) {
      setQuizOpen(true);
    } else {
      setLogging(challenge);
    }
  }

  function handleRequestCompletion(challenge: Challenge) {
    requestCompletion(challenge.id);
    if (!challenge.requiresVerification) {
      setConfirmation({
        title: "Challenge completed",
        message: `Nice work! You earned ${challenge.points} demo points for "${challenge.title}".`,
      });
    }
  }

  function handleVerify(challenge: Challenge) {
    verifyCompletion(challenge.id);
    setConfirmation({
      title: "Participation verified",
      message: `Verified (demo). You earned ${challenge.points} demo points for "${challenge.title}".`,
    });
  }

  function handleQuizPassed() {
    if (!quizChallenge) return;
    // Ensure the challenge is joined, then award quiz points (de-duped by quiz id)
    // and mark the challenge complete. Repeating the quiz never re-awards.
    if (!progress[QUIZ_CHALLENGE_ID]) join(QUIZ_CHALLENGE_ID);
    setProgress(QUIZ_CHALLENGE_ID, quizChallenge.goal.target);
    awardQuiz(QUIZ_ID, quizChallenge.points, quizChallenge.title);
    requestCompletion(QUIZ_CHALLENGE_ID);
    setConfirmation({
      title: "Quiz passed",
      message: `You earned ${quizChallenge.points} demo points for the environmental quiz.`,
    });
  }

  function handleRedeem(rewardId: string) {
    redeem(rewardId);
    const reward = rewards.find((r) => r.id === rewardId);
    setConfirmation({
      title: "Reward redeemed (demo)",
      message: `"${reward?.label ?? "Reward"}" is marked as redeemed. This is a simulated reward — no real voucher is issued.`,
    });
  }

  return (
    <>
      <PageHeader title="Community Challenges" actions={<Pill>Demo data</Pill>} />

      <ChallengeStatsStrip summary={summary} />

      <div className="ui-tabs" role="tablist" aria-label="Challenges sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="ui-tab"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "challenges" && (
        <section className="ui-section" aria-label="Challenges">
          <div className="ui-chip-row" role="group" aria-label="Filter by category">
            {CATEGORY_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className="ui-chip"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {value === "all" ? "All" : CHALLENGE_CATEGORY_LABEL[value]}
              </button>
            ))}
          </div>

          <ul className="ui-grid community-list" style={{ marginTop: "var(--space-4)" }}>
            {visible.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                progress={progress[challenge.id]}
                onJoin={handleJoin}
                onLogProgress={handleLogProgress}
                onRequestCompletion={handleRequestCompletion}
                onVerify={handleVerify}
              />
            ))}
          </ul>
        </section>
      )}

      {tab === "leaderboard" && (
        <section className="ui-section" aria-label="Leaderboard">
          <Leaderboard entries={leaderboard} />
        </section>
      )}

      {tab === "rewards" && (
        <section className="ui-section" aria-label="Rewards and badges">
          <RewardsPanel
            rewards={rewards}
            badges={badges}
            achievements={achievements}
            onRedeem={handleRedeem}
          />
        </section>
      )}

      <LogProgressModal
        key={logging?.id ?? "none"}
        challenge={logging}
        current={logging ? (progress[logging.id]?.current ?? 0) : 0}
        onClose={() => setLogging(null)}
        onSave={(challenge, value) => {
          setProgress(challenge.id, value);
          setLogging(null);
        }}
      />

      <QuizModal
        open={quizOpen}
        questions={MOCK_ECO_QUIZ}
        passTarget={quizChallenge?.goal.target ?? MOCK_ECO_QUIZ.length}
        alreadyEarned={quizAlreadyEarned}
        onClose={() => setQuizOpen(false)}
        onPassed={handleQuizPassed}
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
