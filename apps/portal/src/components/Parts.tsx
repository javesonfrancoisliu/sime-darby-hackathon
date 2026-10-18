import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Circle, CircleAlert, Info } from "lucide-react";

import { checkPassword, PASSWORD_RULES } from "@sdh/auth";
import { Precinct } from "@sdh/contracts";

// Error message, announced by screen readers when it appears.
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="alert">
      <CircleAlert aria-hidden="true" size={26} strokeWidth={2.25} />
      <p>{children}</p>
    </div>
  );
}

// Good news or a hint; announced politely.
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="notice">
      <Info aria-hidden="true" size={24} strokeWidth={2} />
      <p>{children}</p>
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "outline";
  busy?: boolean;
  busyLabel?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({
  children,
  variant = "primary",
  busy = false,
  busyLabel,
  type = "submit",
  onClick,
  disabled,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}`}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

export function LinkButton({
  to,
  children,
  variant = "outline",
}: {
  to: string;
  // Plain text only: react-router in this workspace is typed against React 18, which lacks bigint children.
  children: string;
  variant?: "primary" | "outline" | "text";
}) {
  return (
    <Link to={to} className={variant === "text" ? "link-action" : `btn btn--${variant}`}>
      {children}
    </Link>
  );
}

export function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="text-button" onClick={onClick}>
      {children}
    </button>
  );
}

// The three password rules, ticked live as the person types.
export function PasswordRules({ password }: { password: string }) {
  const check = checkPassword(password);
  const rules = [
    { ok: check.length, text: `${PASSWORD_RULES.minLength} or more characters` },
    { ok: check.lowercase, text: "A small letter" },
    { ok: check.number, text: "A number" },
  ];
  return (
    <ul className="rules" aria-label="Password rules">
      {rules.map((rule) => (
        <li key={rule.text} className={rule.ok ? "rules__item rules__item--ok" : "rules__item"}>
          {rule.ok ? (
            <Check aria-hidden="true" size={22} strokeWidth={2.5} />
          ) : (
            <Circle aria-hidden="true" size={22} strokeWidth={2.5} />
          )}
          <span>{rule.text}</span>
          <span className="visually-hidden">{rule.ok ? " done" : " not yet"}</span>
        </li>
      ))}
    </ul>
  );
}

// Large toggle pills for the four precincts. Not a native select.
export function PrecinctPills({
  value,
  onChange,
}: {
  value: Precinct | undefined;
  onChange: (precinct: Precinct) => void;
}) {
  return (
    <fieldset className="pills">
      <legend className="field__label">Where do you live?</legend>
      <div className="pills__row">
        {Precinct.options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              className={`pill${selected ? " pill--on" : ""}`}
              onClick={() => onChange(option)}
            >
              {selected && <Check aria-hidden="true" size={20} strokeWidth={2.75} />}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
