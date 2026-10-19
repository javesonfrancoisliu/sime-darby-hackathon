import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { House } from "lucide-react";

import { GENERIC_ERROR_COPY, useSession } from "@sdh/api-client";
import { NEXT_PARAM, resendSignUpCode, signIn } from "@sdh/auth";

import { Field, PasswordField } from "../components/Field";
import { Alert, Button, LinkButton, Notice } from "../components/Parts";
import { Screen } from "../components/Screen";
import { APP_NAME, FIELD_COPY, PATHS } from "../lib/constants";
import { isAuthCode, messageFor } from "../lib/errors";
import { useFlow } from "../lib/flow";
import { useSessionRedirect } from "../lib/useSessionRedirect";

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const next = params.get(NEXT_PARAM);
  const notice = (location.state as { notice?: string } | null)?.notice;
  const { refresh, status } = useSession();
  const { rememberPassword } = useFlow();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Covers both "already signed in" and "just signed in": acts once the session has loaded.
  useSessionRedirect({ enabled: true, next });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError(!email.trim() ? FIELD_COPY.needEmail : FIELD_COPY.needPassword);
      return;
    }
    setBusy(true);
    setError(null);
    setWrongPassword(false);
    try {
      await signIn(email.trim(), password);
      setSubmitted(true);
      refresh();
    } catch (err) {
      if (isAuthCode(err, "NOT_CONFIRMED")) {
        try {
          rememberPassword(password);
          await resendSignUpCode(email.trim());
          navigate(PATHS.signUpVerify, { state: { email: email.trim() } });
          return;
        } catch (resendErr) {
          setError(messageFor(resendErr));
        }
      } else {
        setError(messageFor(err));
        setWrongPassword(isAuthCode(err, "INVALID_CREDENTIALS"));
      }
    } finally {
      setBusy(false);
    }
  }

  // After signing in, wait for the session to load; if it cannot, say so and let the person try again.
  const waiting = submitted && status !== "error";
  const shownError = error ?? (submitted && status === "error" ? GENERIC_ERROR_COPY : null);

  // Keep the form out of the way while an existing session is being checked.
  if (status === "loading" && !submitted) {
    return (
      <Screen title="Sign in" heading={APP_NAME} centredHeading>
        <p className="lead lead--centre">One moment please.</p>
      </Screen>
    );
  }

  return (
    <Screen
      title="Sign in"
      heading={APP_NAME}
      centredHeading
      aboveHeading={
        <div className="logo" aria-hidden="true">
          <House size={40} strokeWidth={2} />
        </div>
      }
    >
      <p className="lead lead--centre">Sign in to ask for help or to help a neighbour.</p>
      {notice && <Notice>{notice}</Notice>}
      {shownError && <Alert>{shownError}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          invalid={wrongPassword}
          invalidHint={wrongPassword ? "Check your password" : undefined}
          onChange={(e) => setPassword(e.target.value)}
        />
        <LinkButton to={PATHS.forgot} variant="text">
          Forgot password?
        </LinkButton>
        <Button busy={busy || waiting} busyLabel="Signing in">
          {wrongPassword ? "Try again" : "Sign in"}
        </Button>
        {wrongPassword && <LinkButton to={PATHS.forgot}>Reset my password</LinkButton>}
      </form>
      <div className="footer-block">
        <p className="lead">New to {APP_NAME}?</p>
        <LinkButton to={PATHS.signUp}>Create an account</LinkButton>
      </div>
    </Screen>
  );
}
