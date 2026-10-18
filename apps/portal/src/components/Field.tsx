import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: ReactNode;
  // Short message shown under the field when it is not accepted.
  invalidHint?: string;
  invalid?: boolean;
  children?: ReactNode;
};

// A labelled input. The label is always visible and the placeholder stays as an example.
export function Field({
  label,
  hint,
  invalid,
  invalidHint,
  children,
  className,
  ...input
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const hasHint = Boolean(hint) || Boolean(invalidHint);
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          className={`field__input${invalid ? " field__input--invalid" : ""}${className ? ` ${className}` : ""}`}
          aria-invalid={invalid || undefined}
          aria-describedby={hasHint ? hintId : undefined}
          {...input}
        />
        {children}
      </div>
      {invalidHint ? (
        <span id={hintId} className="field__hint field__hint--invalid">
          {invalidHint}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="field__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

type PasswordFieldProps = Omit<FieldProps, "type" | "children">;

// Password input with a show/hide button, 48px square.
export function PasswordField(props: PasswordFieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <Field {...props} type={shown ? "text" : "password"} className="field__input--with-button">
      <button
        type="button"
        className="field__toggle"
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? <EyeOff aria-hidden="true" size={24} /> : <Eye aria-hidden="true" size={24} />}
      </button>
    </Field>
  );
}
