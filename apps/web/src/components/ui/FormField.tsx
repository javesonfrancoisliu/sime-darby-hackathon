import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
  error?: string;
  /** Optional leading content inside the field row, e.g. an icon. */
  icon?: ReactNode;
};

/**
 * Labelled input with persistent label, helper and error text (48px field via .ui-input).
 * Every input has a visible label and a programmatic association, per inclusive-UX rules.
 */
export function FormField({ label, helper, error, id, icon, ...rest }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = `${fieldId}-helper`;
  const errorId = `${fieldId}-error`;
  const describedBy = [helper ? helperId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={fieldId}>
        {label}
      </label>
      <div className="ui-input-wrap">
        {icon && <span className="ui-input-icon" aria-hidden="true">{icon}</span>}
        <input
          id={fieldId}
          className="ui-input"
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
      </div>
      {helper && !error && (
        <p className="ui-helper" id={helperId}>
          {helper}
        </p>
      )}
      {error && (
        <p className="ui-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
