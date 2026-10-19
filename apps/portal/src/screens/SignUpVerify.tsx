import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

import { ApiError, apiFetch, useSession } from "@sdh/api-client";
import { confirmSignUp, resendSignUpCode, signIn } from "@sdh/auth";
import type { User } from "@sdh/contracts";

import { Alert, Button, Notice, TextButton } from "../components/Parts";
import { Screen } from "../components/Screen";
import { CODE_LENGTH, FIELD_COPY, NOTICE, PATHS } from "../lib/constants";
import { useFlow } from "../lib/flow";
import { clearPending, readPending, toCreateMeBody } from "../lib/pending";
import { useAction } from "../lib/useAction";
import { useSessionRedirect } from "../lib/useSessionRedirect";

const CONFLICT_STATUS = 409;

export function SignUpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useSession();
  const { takePassword } = useFlow();
  const [email] = useState(
    () => (location.state as { email?: string } | null)?.email ?? readPending().email,
  );
  const [code, setCode] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [sent, setSent] = useState(false);
  const { busy, error, setError, run } = useAction();
  // Once the code is accepted it cannot be used again, so a retry skips straight to signing in.
  const confirmedRef = useRef(false);
  const passwordRef = useRef<string | null>(null);

  useSessionRedirect({ enabled: finishing, next: null });

  if (!email) return <Navigate to={PATHS.signUp} replace />;
  const address = email;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) return setError(FIELD_COPY.needCode);
    void run(async () => {
      if (!confirmedRef.current) {
        await confirmSignUp(address, code);
        confirmedRef.current = true;
        passwordRef.current = takePassword();
      }
      const password = passwordRef.current;
      // The password is gone after a reload, so the person signs in again to finish.
      if (!password) {
        navigate(PATHS.signIn, { replace: true, state: { notice: NOTICE.confirmedSignIn } });
        return;
      }
      await signIn(address, password);
      passwordRef.current = null;
      const body = toCreateMeBody(readPending());
      if (body) {
        try {
          await apiFetch<User>("/api/me", { method: "POST", body });
        } catch (err) {
          // Already created: carry on and let the session load it.
          if (!(err instanceof ApiError && err.status === CONFLICT_STATUS)) throw err;
        }
        clearPending();
      }
      setFinishing(true);
      refresh();
    });
  }

  function resend() {
    setSent(false);
    void run(async () => {
      await resendSignUpCode(address);
      setSent(true);
    });
  }

  return (
    <Screen
      title="Check your email"
      backTo={PATHS.signUpDetails}
      backLabel="Back to your details"
      stepLabel="Step 3 of 3"
      step={3}
      aboveHeading={
        <div className="badge-icon" aria-hidden="true">
          <Mail size={36} strokeWidth={2} />
        </div>
      }
    >
      <p className="lead">
        We sent a 6-digit code to <strong>{email}</strong>. Type it below.
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
        <div className="stack-tight">
          <TextButton onClick={resend}>Send a new code</TextButton>
          <Link to={PATHS.signUpDetails} className="link-action">
            Wrong email? Go back and fix it
          </Link>
        </div>
        <Button busy={busy || finishing} busyLabel="Please wait">
          Confirm and start
        </Button>
      </form>
    </Screen>
  );
}
