import { useId } from "react";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "tel" | "text" | "numeric";
}

// FormField - input with a persistent visible label, helper/error text,
// built on the shared ui-label / ui-input / ui-helper / ui-error classes.
// Error is tied via aria-describedby.
export function TextField({
  label,
  value,
  onChange,
  error,
  helper,
  multiline,
  placeholder,
  maxLength,
  inputMode,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = error ? errorId : helper ? helperId : undefined;
  const shared = {
    id,
    className: "ui-input",
    value,
    placeholder,
    maxLength,
    inputMode,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  };
  return (
    <div className="mb-6">
      <label className="ui-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? <textarea rows={4} {...shared} /> : <input type="text" {...shared} />}
      {helper && !error ? (
        <p className="ui-helper" id={helperId}>
          {helper}
        </p>
      ) : null}
      {error ? (
        <p className="ui-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
