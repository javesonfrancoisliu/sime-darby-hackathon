import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { checkPassword, confirmForgotPassword } from "@sdh/auth";

import { Field, PasswordField } from "../components/Field";
import { Alert, Button, PasswordRules } from "../components/Parts";
import { Screen } from "../components/Screen";
import { CODE_LENGTH, FIELD_COPY, NOTICE, PATHS } from "../lib/constants";
import { useAction } from "../lib/useAction";

export function Reset() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const { busy, error, setError, run } = useAction();

  if (!email) return <Navigate to={PATHS.forgot} replace />;
  const address = email;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) return setError(FIELD_COPY.needCode);
    if (!checkPassword(password).ok) return setError(FIELD_COPY.passwordRules);
    if (password !== again) return setError(FIELD_COPY.passwordMismatch);
    void run(async () => {
      await confirmForgotPassword(address, code, password);
      navigate(PATHS.signIn, { replace: true, state: { notice: NOTICE.passwordReset } });
    });
  }

  return (
    <Screen title="Set a new password" heading="Make a new password" backTo={PATHS.forgot}>
      <p className="lead">
        We sent a code to <strong>{email}</strong>.
      </p>
      {error && <Alert>{error}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field
          label="Code from the email"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          placeholder="123456"
          className="field__input--code-small"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          placeholder="Your new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordRules password={password} />
        <PasswordField
          label="Type it again"
          autoComplete="new-password"
          placeholder="Same password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        <Button busy={busy} busyLabel="Saving">
          Save and sign in
        </Button>
      </form>
    </Screen>
  );
}
