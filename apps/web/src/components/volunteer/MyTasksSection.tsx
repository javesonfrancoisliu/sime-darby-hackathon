import { BadgeCheck, CalendarDays, MapPin } from "lucide-react";

import type { AcceptedTask } from "../../data/AcceptedTasksContext";
import { TASK_CATEGORY_LABEL } from "../../types/volunteer";
import { formatDate } from "../../lib/format";
import { AppButton, InfoCard, Pill, StatusBadge } from "../ui";

export type MyTasksSectionProps = {
  tasks: AcceptedTask[];
  onComplete: (task: AcceptedTask) => void;
  onVerify: (task: AcceptedTask) => void;
};

/**
 * Compact tracking list of accepted Help-a-Neighbour tasks. Status flow:
 *   accepted  → "Mark complete" (self-reported)
 *   completed → "Verify (demo)" simulated resident confirmation → awards points
 *   verified  → verified badge
 * Hidden entirely when there are no accepted tasks.
 */
export function MyTasksSection({ tasks, onComplete, onVerify }: MyTasksSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <section className="ui-section" aria-labelledby="my-tasks-heading">
      <h2 className="ui-section-title" id="my-tasks-heading">
        My accepted tasks
      </h2>
      <ul className="community-list ui-stack">
        {tasks.map((task) => (
          <InfoCard as="li" key={task.id} ariaLabel={`Accepted task: ${task.title}`}>
            <div className="feature-card">
              <div className="feature-card-head">
                <h3 className="feature-card-title">{task.title}</h3>
                <Pill>{TASK_CATEGORY_LABEL[task.category]}</Pill>
              </div>

              <div className="ui-stack" style={{ gap: "var(--space-2)" }}>
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
                    <StatusBadge label="Accepted" variant="info" />
                    <AppButton variant="secondary" onClick={() => onComplete(task)}>
                      Mark complete
                    </AppButton>
                  </>
                )}

                {task.status === "completed" && (
                  <>
                    <StatusBadge label="Completed (self-reported)" variant="warning" />
                    {/* Simulated resident confirmation — stands in for the elderly
                        resident confirming. Only this awards verified points.
                        DEMO ONLY: in a real system a volunteer must never verify
                        their own task; the resident confirms it. */}
                    <AppButton variant="primary" onClick={() => onVerify(task)}>
                      Confirm (Demo)
                    </AppButton>
                    <p className="ui-helper">
                      Demo only: this simulates the elderly resident confirming the
                      help was received. In the real app, volunteers cannot verify
                      their own tasks.
                    </p>
                  </>
                )}

                {task.status === "verified" && (
                  <StatusBadge label="Verified (demo)" variant="success" icon={BadgeCheck} />
                )}
              </div>
            </div>
          </InfoCard>
        ))}
      </ul>
    </section>
  );
}
