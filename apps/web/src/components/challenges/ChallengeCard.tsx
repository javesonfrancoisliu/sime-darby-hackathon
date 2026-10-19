import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import type { Challenge, ChallengeProgress } from "../../types/gamification";
import { CHALLENGE_CATEGORY_LABEL } from "../../types/gamification";
import { AppButton, InfoCard, Pill, ProgressBar, StatusBadge } from "../ui";

export type ChallengeCardProps = {
  challenge: Challenge;
  progress?: ChallengeProgress;
  onJoin: (challenge: Challenge) => void;
  onLogProgress: (challenge: Challenge) => void;
  onRequestCompletion: (challenge: Challenge) => void;
  onVerify: (challenge: Challenge) => void;
};

/**
 * One challenge: category, points reward, progress toward goal, status and the
 * single action appropriate to its current state. Points are only awarded on
 * verified completion — joining and logging progress never award points.
 */
export function ChallengeCard({
  challenge,
  progress,
  onJoin,
  onLogProgress,
  onRequestCompletion,
  onVerify,
}: ChallengeCardProps) {
  const status = progress?.status ?? "available";
  const current = progress?.current ?? 0;
  const goalReached = current >= challenge.goal.target;

  return (
    <InfoCard as="li" ariaLabel={`Challenge: ${challenge.title}`}>
      <div className="feature-card">
        <div className="feature-card-head">
          <h3 className="feature-card-title">{challenge.title}</h3>
          <Pill>{CHALLENGE_CATEGORY_LABEL[challenge.category]}</Pill>
        </div>

        <div className="ui-chip-row" style={{ gap: "var(--space-2)" }}>
          <span className="match-score" title="Points for verified completion">
            <Sparkles size={14} aria-hidden="true" />
            {challenge.points} pts
          </span>
          {challenge.requiresVerification && (
            <span className="ui-pill">
              <ShieldCheck size={12} aria-hidden="true" /> Verified participation
            </span>
          )}
        </div>

        <p className="feature-card-desc">{challenge.summary}</p>

        {status !== "available" && (
          <ProgressBar
            value={Math.min(current, challenge.goal.target)}
            max={challenge.goal.target}
            label={`${challenge.title} progress`}
            caption={`${Math.min(current, challenge.goal.target)} / ${challenge.goal.target} ${challenge.goal.unit}`}
          />
        )}

        <div className="feature-card-foot">
          {status === "available" && (
            <AppButton variant="primary" onClick={() => onJoin(challenge)}>
              Join challenge
            </AppButton>
          )}

          {status === "in_progress" && (
            <>
              <AppButton variant="secondary" onClick={() => onLogProgress(challenge)}>
                Log progress
              </AppButton>
              {goalReached && (
                <AppButton variant="primary" onClick={() => onRequestCompletion(challenge)}>
                  {challenge.requiresVerification ? "Submit for verification" : "Mark done"}
                </AppButton>
              )}
            </>
          )}

          {status === "pending_verification" && (
            <>
              <StatusBadge label="Awaiting verification" variant="warning" />
              {/* Simulated verification step — stands in for real verified participation. */}
              <AppButton variant="primary" onClick={() => onVerify(challenge)}>
                Verify (demo)
              </AppButton>
            </>
          )}

          {status === "completed" && (
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
