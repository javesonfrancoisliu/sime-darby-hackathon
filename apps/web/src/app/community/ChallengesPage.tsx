import { ArrowLeft, CloudOff, Gift, Sparkles, Target, Trophy } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { ApiError, errorMessage, useSession } from "@sdh/api-client";
import type {
  ChallengeCategory,
  ChallengeWithProgress,
  QuizPublic,
  QuizResult,
  RewardWithStatus,
} from "@sdh/contracts";

import {
  BadgeGrid,
  ChallengeCard,
  ChallengeStatsStrip,
  Leaderboard,
  LogProgressModal,
  QuizModal,
  RewardsPanel,
} from "../../components/challenges";
import {
  AppButton,
  AppLinkButton,
  ConfirmActionDialog,
  ConfirmationDialog,
  EmptyState,
  InfoCard,
  LoadingState,
  Modal,
  PageHeader,
  SignInPrompt,
  TabPanel,
  Tabs,
} from "../../components/ui";
import { useConfirm } from "../../lib/useConfirm";
import { useProfile } from "../../data/ProfileContext";
import {
  actionErrorMessage,
  completeChallenge,
  contributeToChallenge,
  fetchQuiz,
  joinChallenge,
  logChallengeProgress,
  redeemReward,
  submitQuiz,
  useBadges,
  useChallenges,
  useLeaderboard,
  usePoints,
  useRewards,
} from "../../data/useGamification";
import { CHALLENGE_CATEGORY_LABEL } from "../../types/gamification";

type Tab = "challenges" | "leaderboard" | "badges" | "rewards";
type CategoryFilter = "all" | ChallengeCategory;

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "challenges", label: "Challenges", icon: <Target size={18} /> },
  { id: "leaderboard", label: "Rankings", icon: <Trophy size={18} /> },
  { id: "badges", label: "Badges", icon: <Sparkles size={18} /> },
  { id: "rewards", label: "Rewards", icon: <Gift size={18} /> },
];

const CATEGORY_FILTERS: CategoryFilter[] = [
  "all",
  "fitness",
  "cleanup",
  "environment",
  "community",
];

type Notice = { title: string; message: string };

function pointsText(points: number): string {
  return points > 0 ? ` You earned ${points} points.` : "";
}

export function ChallengesPage() {
  const { user } = useSession();
  const challenges = useChallenges();
  const points = usePoints();
  const rewards = useRewards();
  const badges = useBadges();
  const leaderboard = useLeaderboard();
  const { leaderboardOptIn, setLeaderboardOptIn } = useProfile();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: Tab = TABS.find((item) => item.id === requestedTab)?.id ?? "challenges";
  function setTab(next: Tab) {
    setSearchParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set("tab", next);
      return updated;
    });
  }
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [logging, setLogging] = useState<ChallengeWithProgress | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quiz, setQuiz] = useState<QuizPublic | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizChallenge, setQuizChallenge] = useState<ChallengeWithProgress | null>(null);
  const [optInBusy, setOptInBusy] = useState(false);
  const [optInError, setOptInError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Notice | null>(null);
  const [failure, setFailure] = useState<Notice | null>(null);
  const confirm = useConfirm();

  const list = useMemo(() => challenges.data?.challenges ?? [], [challenges.data]);
  const visible = useMemo(
    () => (category === "all" ? list : list.filter((c) => c.category === category)),
    [list, category],
  );
  const completed = list.filter((c) => c.progress?.status === "completed").length;
  const earnedBadges = (badges.data?.badges ?? []).filter((b) => b.earned).length;

  async function reloadAll() {
    await Promise.all([
      challenges.reload(),
      points.reload(),
      rewards.reload(),
      badges.reload(),
      leaderboard.reload(),
    ]);
  }

  // Runs one action, then refreshes every list, since points, badges and rewards all move together.
  async function run<T>(
    id: string,
    action: () => Promise<T>,
    done: (result: T) => Notice,
    failureTitle: string,
    failureText: (err: unknown) => string = actionErrorMessage,
  ) {
    setBusyId(id);
    try {
      const result = await action();
      setConfirmation(done(result));
    } catch (err) {
      setFailure({ title: failureTitle, message: failureText(err) });
    } finally {
      await reloadAll();
      setBusyId(null);
    }
  }

  function handleJoin(challenge: ChallengeWithProgress) {
    confirm.ask({
      title: "Join this challenge?",
      message: challenge.quizId
        ? `Join "${challenge.title}"? You can take the quiz afterwards.`
        : `Join "${challenge.title}"? You can log your progress afterwards.`,
      confirmLabel: "Yes, join",
      onConfirm: () =>
        run(
          challenge.id,
          () => joinChallenge(challenge.id),
          () => ({
            title: "Challenge joined",
            message: challenge.quizId
              ? `You joined "${challenge.title}". Take the quiz to earn your points.`
              : `You joined "${challenge.title}". Log your progress as you go.`,
          }),
          "Couldn't join the challenge",
        ),
    });
  }

  function handleComplete(challenge: ChallengeWithProgress) {
    void run(
      challenge.id,
      () => completeChallenge(challenge.id),
      (result) =>
        result.progress.status === "completed"
          ? {
              title: "Challenge completed",
              message: `Nice work on "${challenge.title}".${pointsText(result.pointsAwarded)}`,
            }
          : {
              title: "Sent for verification",
              message: `"${challenge.title}" is waiting to be verified. Points are added once it is.`,
            },
      "Couldn't complete the challenge",
    );
  }

  function handleContribute(challenge: ChallengeWithProgress) {
    void run(
      challenge.id,
      () => contributeToChallenge(challenge.id),
      (result) => ({
        title: "Contribution added",
        message: `Thanks for adding to "${challenge.title}".${pointsText(result.pointsAwarded)}`,
      }),
      "Couldn't add your contribution",
      (err) =>
        err instanceof ApiError && err.code === "ALREADY_DONE"
          ? "You have already contributed today. Come back tomorrow."
          : actionErrorMessage(err),
    );
  }

  async function handleSaveProgress(challenge: ChallengeWithProgress, value: number) {
    setBusyId(challenge.id);
    setLogError(null);
    try {
      await logChallengeProgress(challenge.id, value);
      setLogging(null);
    } catch (err) {
      setLogError(actionErrorMessage(err));
    } finally {
      await challenges.reload();
      setBusyId(null);
    }
  }

  function handleTakeQuiz(challenge: ChallengeWithProgress) {
    if (!challenge.quizId) return;
    setQuizChallenge(challenge);
    setQuiz(null);
    setQuizError(null);
    setQuizOpen(true);
    fetchQuiz(challenge.quizId).then(setQuiz, (err: unknown) => setQuizError(errorMessage(err)));
  }

  async function handleSubmitQuiz(
    answers: { questionId: string; optionIndex: number }[],
  ): Promise<QuizResult> {
    if (!quizChallenge?.quizId) throw new Error("This quiz is no longer available.");
    try {
      return await submitQuiz(quizChallenge.quizId, { answers });
    } catch (err) {
      throw new Error(actionErrorMessage(err), { cause: err });
    } finally {
      await reloadAll();
    }
  }

  function handleRedeem(reward: RewardWithStatus) {
    confirm.ask({
      title: "Redeem this reward?",
      message: `Redeem "${reward.title}" for ${reward.pointsCost} points?`,
      confirmLabel: "Yes, redeem",
      onConfirm: () =>
        run(
          reward.id,
          () => redeemReward(reward.id),
          (result) => ({
            title: "Reward redeemed",
            message: `"${reward.title}" is yours. You have ${result.points} points left. Find your voucher in Profile under My rewards and select Use now when you want to use it.`,
          }),
          "Couldn't redeem the reward",
        ),
    });
  }

  async function handleOptIn(next: boolean) {
    setOptInBusy(true);
    setOptInError(null);
    try {
      await setLeaderboardOptIn(next);
      await leaderboard.reload();
    } catch (err) {
      setOptInError(errorMessage(err));
    } finally {
      setOptInBusy(false);
    }
  }

  if (!user) {
    return (
      <>
        <PageHeader title="Community Challenges" />
        <SignInPrompt what="your challenges" />
      </>
    );
  }

  return (
    <>
      <AppLinkButton to="/community" variant="ghost" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Community
      </AppLinkButton>
      <PageHeader title="Community Challenges" />

      <ChallengeStatsStrip
        points={points.data?.points ?? 0}
        completed={completed}
        badges={earnedBadges}
      />

      <Tabs
        idBase="challenges"
        label="Challenges sections"
        tabs={TABS}
        value={tab}
        onChange={setTab}
      />

      {tab === "challenges" && (
        <TabPanel idBase="challenges" id="challenges">
          <section className="ui-section" aria-labelledby="challenges-heading">
            <h2 className="ui-visually-hidden" id="challenges-heading">
              Challenges
            </h2>
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

            {challenges.loading ? (
              <LoadingState rows={3} label="Loading challenges" />
            ) : challenges.error ? (
              <InfoCard>
                <EmptyState
                  icon={CloudOff}
                  title="Couldn't load challenges"
                  description={challenges.error}
                  action={
                    <AppButton variant="secondary" onClick={() => void challenges.reload()}>
                      Try again
                    </AppButton>
                  }
                />
              </InfoCard>
            ) : visible.length === 0 ? (
              <InfoCard>
                <EmptyState
                  icon={Trophy}
                  title="No challenges here yet"
                  description="New challenges will show up here."
                />
              </InfoCard>
            ) : (
              <ul className="ui-grid community-list" style={{ marginTop: "var(--space-4)" }}>
                {visible.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    busyId={busyId}
                    onJoin={handleJoin}
                    onLogProgress={(c) => {
                      setLogError(null);
                      setLogging(c);
                    }}
                    onComplete={handleComplete}
                    onTakeQuiz={handleTakeQuiz}
                    onContribute={handleContribute}
                  />
                ))}
              </ul>
            )}
          </section>
        </TabPanel>
      )}

      {tab === "leaderboard" && (
        <TabPanel idBase="challenges" id="leaderboard">
          <section className="ui-section" aria-labelledby="leaderboard-heading">
            <h2 className="ui-visually-hidden" id="leaderboard-heading">
              Leaderboard
            </h2>
            <Leaderboard
              entries={leaderboard.data?.entries ?? []}
              me={leaderboard.data?.me}
              loading={leaderboard.loading}
              error={leaderboard.error}
              optedIn={leaderboardOptIn}
              optInBusy={optInBusy}
              optInError={optInError}
              onOptInChange={(next) => void handleOptIn(next)}
            />
          </section>
        </TabPanel>
      )}

      {tab === "badges" && (
        <TabPanel idBase="challenges" id="badges">
          <section className="ui-section" aria-labelledby="badges-heading">
            <h2 className="ui-section-title inline-icon" id="badges-heading">
              <Sparkles size={22} aria-hidden="true" /> Participation Badges
            </h2>
            {badges.loading ? (
              <LoadingState rows={2} label="Loading badges" />
            ) : badges.error ? (
              <InfoCard>
                <EmptyState
                  icon={CloudOff}
                  title="Couldn't load badges"
                  description={badges.error}
                  action={
                    <AppButton variant="secondary" onClick={() => void badges.reload()}>
                      Try again
                    </AppButton>
                  }
                />
              </InfoCard>
            ) : (
              <BadgeGrid badges={badges.data?.badges ?? []} />
            )}
          </section>
        </TabPanel>
      )}

      {tab === "rewards" && (
        <TabPanel idBase="challenges" id="rewards">
          <section className="ui-section" aria-labelledby="rewards-heading">
            <h2 className="ui-section-title inline-icon" id="rewards-heading">
              <Gift size={22} aria-hidden="true" /> Rewards &amp; Vouchers
            </h2>
            <RewardsPanel
              rewards={rewards.data?.rewards ?? []}
              balance={points.data?.points ?? 0}
              loading={rewards.loading}
              error={rewards.error}
              redeemingId={busyId}
              onRedeem={handleRedeem}
            />
          </section>
        </TabPanel>
      )}

      <LogProgressModal
        key={logging?.id ?? "none"}
        challenge={logging}
        current={logging?.progress?.current ?? 0}
        busy={busyId !== null && busyId === logging?.id}
        error={logError}
        onClose={() => setLogging(null)}
        onSave={(challenge, value) => void handleSaveProgress(challenge, value)}
      />

      <QuizModal
        key={quizChallenge?.id ?? "no-quiz"}
        open={quizOpen}
        quiz={quiz}
        points={quizChallenge?.points ?? 0}
        loadError={quizError}
        onSubmit={handleSubmitQuiz}
        onClose={() => setQuizOpen(false)}
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
