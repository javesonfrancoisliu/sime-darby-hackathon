import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useSession } from "@sdh/api-client";
import { changePassword, checkPassword } from "@sdh/auth";

import { PasswordField } from "../components/Field";
import { Alert, Button, LinkButton, PasswordRules } from "../components/Parts";
import { Screen } from "../components/Screen";
import { FIELD_COPY, NOTICE, PATHS } from "../lib/constants";
import { useAction } from "../lib/useAction";

export function ChangePassword() {
  const navigate = useNavigate();
  const { status } = useSession();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const { busy, error, setError, run } = useAction();

  if (status === "signed_out") return <Navigate to={PATHS.signIn} replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!current) return setError(FIELD_COPY.needPassword);
    if (!checkPassword(password).ok) return setError(FIELD_COPY.passwordRules);
    if (password !== again) return setError(FIELD_COPY.passwordMismatch);
    void run(async () => {
      await changePassword(current, password);
      navigate(PATHS.account, { replace: true, state: { notice: NOTICE.passwordChanged } });
    });
  }

  return (
    <Screen
      title="Change password"
      backTo={PATHS.account}
      backLabel="Back to your account"
      inlineHeading
    >
      {error && <Alert>{error}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field-group">
          <PasswordField
            label="Current password"
            autoComplete="current-password"
            placeholder="The one you use now"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <LinkButton to={PATHS.forgot} variant="text">
            Forgot it?
          </LinkButton>
        </div>
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
          Save new password
        </Button>
        <LinkButton to={PATHS.account}>Cancel</LinkButton>
      </form>
    </Screen>
  );
}
