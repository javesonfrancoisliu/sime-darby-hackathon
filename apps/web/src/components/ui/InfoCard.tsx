import type { ReactNode } from "react";

export type InfoCardProps = {
  children: ReactNode;
  // Extra classes, e.g. "featured-card".
  className?: string;
  // Renders the card as an <article> with an accessible label.
  as?: "div" | "article" | "li";
  ariaLabel?: string;
};

// Base surface card. White, 16px radius, border + subtle shadow come from .ui-card.
// Feature cards (EventCard, etc.) compose this rather than re-styling a surface.
export function InfoCard({ children, className, as = "div", ariaLabel }: InfoCardProps) {
  const Tag = as;
  const classes = ["ui-card", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} aria-label={ariaLabel}>
      {children}
    </Tag>
  );
}
