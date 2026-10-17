import { CheckCircle2, CircleDot, Clock, Info, type LucideIcon } from "lucide-react";

import type { BadgeVariant } from "../../lib/status";

const VARIANT_ICON: Record<BadgeVariant, LucideIcon> = {
  success: CheckCircle2,
  warning: Clock,
  info: Info,
  danger: CircleDot,
};

export type StatusBadgeProps = {
  label: string;
  variant: BadgeVariant;
  /** Override the default icon for the variant. */
  icon?: LucideIcon;
};

/**
 * Status pill with icon + text (never color alone), per the inclusive-UX rule.
 * Background/colors from .ui-badge--* tokens.
 */
export function StatusBadge({ label, variant, icon }: StatusBadgeProps) {
  const Icon = icon ?? VARIANT_ICON[variant];
  return (
    <span className={`ui-badge ui-badge--${variant}`}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  );
}
