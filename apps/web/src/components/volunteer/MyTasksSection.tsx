import { BadgeCheck, CalendarDays, MapPin } from "lucide-react";
import { useState } from "react";

import { errorMessage } from "@sdh/api-client";

import type { AcceptedTask } from "../../data/AcceptedTasksContext";
import { TASK_CATEGORY_LABEL } from "../../types/volunteer";
import { formatDate, formatPoints } from "../../lib/format";
import { useNow } from "../../lib/useNow";
import { AppButton, InfoCard, Pill, StatusBadge } from "../ui";

// How often the "has it started" check is made again.
const STARTED_REFRESH_MS = 30_000;

export type MyTasksSectionProps = {
  tasks: AcceptedTask[];
  onComplete: (task: AcceptedTask) => void;
  // When given, accepted requests offer Withdraw with an inline confirmation. Rejects with an error.
  onWithdraw?: (task: AcceptedTask) => Promise<void>;
  // Points the server awarded per task id, from the points ledger.
  pointsByTask: ReadonlyMap<string, number>;
  title?: string;
};

// Compact tracking list of accepted Township Connect tasks. Status flow:
//   accepted  -> volunteer marks it complete once it has started, or withdraws before then
//   completed -> event attendance recorded, or request waiting for resident confirmation
//   confirmed -> confirmed by the resident, with the points the server awarded
// Hidden entirely when there are no accepted tasks.
export function MyTasksSection({
  tasks,
  onComplete,
  onWithdraw,
  pointsByTask,
  title = "My accepted tasks",
}: MyTasksSectionProps) {
  const now = useNow(STARTED_REFRESH_MS);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  if (tasks.length === 0) return null;

  async function withdraw(task: AcceptedTask) {
    if (!onWithdraw) return;
    setWithdrawBusy(true);
    setWithdrawError(null);
    try {
      await onWithdraw(task);
      setWithdrawing(null);
    } catch (err) {
      setWithdrawError(errorMessage(err));
    } finally {
      setWithdrawBusy(false);
    }
  }

  return (
    <section className="ui-section" aria-labelledby="my-tasks-heading">
      <h2 className="ui-section-title" id="my-tasks-heading">
        {title}
      </h2>
      <ul className="community-list ui-stack">
        {tasks.map((task) => {
          const points = pointsByTask.get(task.id);
          return (
            <InfoCard as="li" key={task.id} ariaLabel={`Accepted task: ${task.title}`}>
              <div className="feature-card">
                <div className="feature-card-head">
                  <h3 className="feature-card-title">{task.title}</h3>
                  <Pill>{TASK_CATEGORY_LABEL[task.category]}</Pill>
                </div>

                <div className="ui-stack ui-gap-2">
                  <span className="inline-icon">
                    <MapPin size={16} className="icon-dim" aria-hidden="true" />
                    {task.area}
                  </span>
                  <span className="inline-icon">
                    <CalendarDays size={16} className="icon-dim" aria-hidden="true" />
                    {formatDate(task.scheduledAt)}
                  </span>
                </div>

                <div className="feature-card-foot task-foot">
                  {task.status === "accepted" && (
                    <>
                      <StatusBadge
                        label={task.kind === "event" ? "Joined" : "Accepted"}
                        variant="info"
                      />
                      {Date.parse(task.scheduledAt) <= now ? (
                        <AppButton
                          variant="secondary"
                          aria-label={`Mark complete: ${task.title}`}
                          onClick={() => onComplete(task)}
                        >
                          Mark complete
                        </AppButton>
                      ) : (
                        <p className="ui-helper">You can mark this complete once it starts.</p>
                      )}
                      {onWithdraw && task.kind === "request" && withdrawing !== task.id && (
                        <AppButton
                          variant="ghost"
                          aria-label={`Withdraw from ${task.title}`}
                          onClick={() => {
                            setWithdrawError(null);
                            setWithdrawing(task.id);
                          }}
                        >
                          Withdraw
                        </AppButton>
                      )}
                      {withdrawing === task.id && (
                        <div
                          className="task-confirm"
                          role="group"
                          aria-label={`Withdraw from ${task.title}?`}
                        >
                          <p className="ui-flush ui-semibold">Withdraw from this task?</p>
                          <p className="ui-helper">
                            It goes back to the list so another volunteer can take it.
                          </p>
                          {withdrawError && (
                            <p className="ui-error ui-flush" role="alert">
                              {withdrawError}
                            </p>
                          )}
                          <AppButton
                            variant="danger"
                            loading={withdrawBusy}
                            onClick={() => void withdraw(task)}
                          >
                            Yes, withdraw
                          </AppButton>
                          <AppButton
                            variant="ghost"
                            disabled={withdrawBusy}
                            onClick={() => setWithdrawing(null)}
                          >
                            Keep task
                          </AppButton>
                        </div>
                      )}
                    </>
                  )}

                  {task.status === "completed" && task.kind === "event" && (
                    <StatusBadge label="Completed" variant="success" icon={BadgeCheck} />
                  )}

                  {task.status === "completed" && task.kind === "request" && (
                    <>
                      <StatusBadge label="Waiting for the resident to confirm" variant="warning" />
                      <p className="ui-helper">
                        Your points are added once the resident confirms the help was received.
                      </p>
                    </>
                  )}

                  {task.status === "confirmed" && (
                    <StatusBadge
                      label={
                        points !== undefined
                          ? `Confirmed by the resident, +${formatPoints(points)}`
                          : "Confirmed by the resident"
                      }
                      variant="success"
                      icon={BadgeCheck}
                    />
                  )}
                </div>
              </div>
            </InfoCard>
          );
        })}
      </ul>
    </section>
  );
}
