import type { ReactNode } from "react";

export type PillProps = {
  children: ReactNode;
  className?: string;
};

/** Neutral rounded tag for a category or topic label. */
export function Pill({ children, className }: PillProps) {
  const classes = ["ui-pill", className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
