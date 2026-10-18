import type { ButtonHTMLAttributes, ReactNode } from "react";

// Variants from the shared design system's AppButton (DESIGN_SYSTEM.md §5).
type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
}

// AppButton - text-labelled button using shared ui-button classes.
// Height/radius/colour come from the shared tokens; 56px under Easy View.
export function Button({ variant = "primary", block = false, children, className, style, ...rest }: ButtonProps) {
  const classes = ["ui-button", `ui-button--${variant}`];
  if (className) classes.push(className);
  return (
    <button
      className={classes.join(" ")}
      style={block ? { width: "100%", ...style } : style}
      {...rest}
    >
      {children}
    </button>
  );
}
