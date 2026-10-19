import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export type AppLinkButtonProps = LinkProps & {
  variant?: Variant;
  children: ReactNode;
};

/**
 * Router link styled as a button, for navigation CTAs (e.g. "View details").
 * Shares the exact .ui-button--* styles so links and buttons look identical.
 */
export function AppLinkButton({
  variant = "primary",
  className,
  children,
  ...rest
}: AppLinkButtonProps) {
  const classes = ["ui-button", `ui-button--${variant}`, className].filter(Boolean).join(" ");
  return (
    <Link className={classes} {...rest}>
      {children}
    </Link>
  );
}
