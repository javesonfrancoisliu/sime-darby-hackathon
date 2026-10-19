import { CheckCircle2, Clock, ShieldCheck, Sparkles, Users } from "lucide-react";

import type { ChallengeWithProgress } from "@sdh/contracts";

import { CHALLENGE_CATEGORY_LABEL } from "../../types/gamification";
import { formatDate } from "../../lib/format";
import { ICON_BY_KEY } from "../../lib/icons";
import { AppButton, InfoCard, Pill, ProgressBar, StatusBadge } from "../ui";

export type ChallengeCardProps = {
  challenge: ChallengeWithProgress;
  // The id of the challenge with an action in flight, so its buttons can show they are working.
  busyId: string | null;
  onJoin: (challenge: ChallengeWithProgress) => void;
  onLogProgress: (challenge: ChallengeWithProgress) => void;
  onComplete: (challenge: ChallengeWithProgress) => void;
  onTakeQuiz: (challenge: ChallengeWithProgress) => void;
  onContribute: (challenge: ChallengeWithProgress) => void;
};

// One challenge: category, reward, progress toward the goal and the single action that fits its
// state. Team challenges count the whole precinct and take one contribution a day; individual
// challenges are joined, logged and completed by the person. Points come from the server only.
export function ChallengeCard({
  challenge,
  busyId,
  onJoin,
  onLogProgress,
  onComplete,
  onTakeQuiz,
  onContribute,
}: ChallengeCardProps) {
  const Icon = ICON_BY_KEY[challenge.icon];
  const busy = busyId === challenge.id;
  const team = challenge.mode === "team";
  const { target, unit } = challenge.goal;
  const status = challenge.progress?.status;
  const current = team
    ? (challenge.teamProgress?.current ?? 0)
    : (challenge.progress?.current ?? 0);
  const shown = Math.min(current, target);
  const goalReached = current >= target;

  return (
    <InfoCard as="li" ariaLabel={`Challenge: ${challenge.title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">
            <span className="inline-icon">
              <Icon size={18} className="icon-dim" aria-hidden="true" />
              {challenge.title}
            </span>
          </h3>
          <Pill>{CHALLENGE_CATEGORY_LABEL[challenge.category]}</Pill>
        </div>

        <div className="ui-chip-row ui-gap-2">
          {team ? (
            <span className="ui-pill">
              <Users size={12} aria-hidden="true" /> Team challenge
              {challenge.teamProgress ? ` · ${challenge.teamProgress.precinct}` : ""}
            </span>
          ) : (
            <span className="match-score" title="Points for completing this challenge">
              <Sparkles size={14} aria-hidden="true" />
              {challenge.points} pts
            </span>
          )}
          {challenge.requiresVerification && (
            <span className="ui-pill">
              <ShieldCheck size={12} aria-hidden="true" /> Verified participation
            </span>
          )}
        </div>

        <p className="feature-card-desc">{challenge.description}</p>

        {team && challenge.teamReward && (
          <span className="ui-meta-row">Team reward: {challenge.teamReward}</span>
        )}

        {(team || status !== undefined) && (
          <ProgressBar
            value={shown}
            max={target}
            label={`${challenge.title} progress`}
            caption={`${shown} / ${target} ${unit}`}
          />
        )}

        <span className="ui-meta-row">
          {challenge.ended ? "Ended" : "Ends"} {formatDate(challenge.endsOn)}
        </span>

        <div className="feature-card-foot">
          {challenge.ended && status !== "completed" && (
            <StatusBadge label="Ended" variant="info" icon={Clock} />
          )}

          {!challenge.ended && team && (
            <AppButton variant="primary" loading={busy} onClick={() => onContribute(challenge)}>
              Add today&rsquo;s contribution
            </AppButton>
          )}

          {!challenge.ended && !team && status === undefined && (
            <AppButton variant="primary" loading={busy} onClick={() => onJoin(challenge)}>
              Join challenge
            </AppButton>
          )}

          {!challenge.ended && !team && status === "in_progress" && (
            <>
              {challenge.quizId ? (
                <AppButton variant="primary" onClick={() => onTakeQuiz(challenge)}>
                  Take the quiz
                </AppButton>
              ) : (
                <AppButton variant="secondary" onClick={() => onLogProgress(challenge)}>
                  Log progress
                </AppButton>
              )}
              {goalReached && !challenge.quizId && (
                <AppButton variant="primary" loading={busy} onClick={() => onComplete(challenge)}>
                  {challenge.requiresVerification ? "Submit for verification" : "Mark done"}
                </AppButton>
              )}
            </>
          )}

          {!team && status === "pending_verification" && (
            <StatusBadge label="Waiting for verification" variant="warning" />
          )}

          {!team && status === "completed" && (
            <StatusBadge
              label={`Completed · +${challenge.points} pts`}
              variant="success"
              icon={CheckCircle2}
            />
          )}
        </div>
      </div>
    </InfoCard>
  );
}
