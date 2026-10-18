import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useSession } from "@sdh/api-client";
import { confirmEmailChange, resendEmailChangeCode } from "@sdh/auth";

import { Alert, Button, LinkButton, Notice, TextButton } from "../components/Parts";
import { Screen } from "../components/Screen";
import { CODE_LENGTH, FIELD_COPY, NOTICE, PATHS } from "../lib/constants";
import { useAction } from "../lib/useAction";

export function ChangeEmailVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useSession();
  const email = (location.state as { email?: string } | null)?.email;
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, setError, run } = useAction();

  if (status === "signed_out") return <Navigate to={PATHS.signIn} replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) return setError(FIELD_COPY.needCode);
    void run(async () => {
      await confirmEmailChange(code);
      navigate(PATHS.account, { replace: true, state: { notice: NOTICE.emailChanged } });
    });
  }

  function resend() {
    setSent(false);
    void run(async () => {
      await resendEmailChangeCode();
      setSent(true);
    });
  }

  return (
    <Screen
      title="Check your new email"
      backTo={PATHS.accountEmail}
      backLabel="Back to change email"
    >
      <p className="lead">
        We sent a 6-digit code to <strong>{email ?? "your new email"}</strong>. Type it below.
      </p>
      {error && <Alert>{error}</Alert>}
      {sent && <Notice>{FIELD_COPY.codeSent}</Notice>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="code" className="field__label">
            Code
          </label>
          <input
            id="code"
            className="field__input field__input--code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <span className="field__hint">
            The code works for a short time. Codes can take a minute to arrive.
          </span>
        </div>
        <TextButton onClick={resend}>Send a new code</TextButton>
        <Button busy={busy} busyLabel="Please wait">
          Confirm new email
        </Button>
        <LinkButton to={PATHS.account}>Cancel</LinkButton>
      </form>
    </Screen>
  );
}
