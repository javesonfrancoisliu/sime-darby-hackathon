import { BadgeCheck, CalendarDays, MapPin } from "lucide-react";

import type { AcceptedTask } from "../../data/AcceptedTasksContext";
import { TASK_CATEGORY_LABEL } from "../../types/volunteer";
import { formatDate } from "../../lib/format";
import { AppButton, InfoCard, Pill, StatusBadge } from "../ui";

export type MyTasksSectionProps = {
  tasks: AcceptedTask[];
  onComplete: (task: AcceptedTask) => void;
  // Points the server awarded per task id, from the points ledger.
  pointsByTask: ReadonlyMap<string, number>;
};

// Compact tracking list of accepted Help-a-Neighbour tasks. Status flow:
//   accepted  -> volunteer confirms their request or event attendance is complete
//   completed -> event attendance recorded, or request waiting for resident confirmation
//   confirmed -> confirmed by the resident, with the points the server awarded
// Hidden entirely when there are no accepted tasks.
export function MyTasksSection({ tasks, onComplete, pointsByTask }: MyTasksSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <section className="ui-section" aria-labelledby="my-tasks-heading">
      <h2 className="ui-section-title" id="my-tasks-heading">
        My accepted tasks
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
                      <AppButton variant="secondary" onClick={() => onComplete(task)}>
                        Confirm completion
                      </AppButton>
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
                          ? `Confirmed by the resident, +${points} points`
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
