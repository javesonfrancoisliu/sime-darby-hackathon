import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional next-step action — an empty state should never be a dead end. */
  action?: ReactNode;
};

/** Friendly empty state with a clear message and (ideally) a next step. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const Icon = icon ?? Inbox;
  return (
    <div className="ui-empty" role="status">
      <Icon aria-hidden="true" />
      <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>{title}</p>
      {description && <p style={{ margin: 0 }}>{description}</p>}
      {action}
    </div>
  );
}
