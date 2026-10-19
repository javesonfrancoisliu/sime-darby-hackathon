import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

import { forgotPassword } from "@sdh/auth";

import { Field } from "../components/Field";
import { Alert, Button } from "../components/Parts";
import { Screen } from "../components/Screen";
import { FIELD_COPY, PATHS } from "../lib/constants";
import { useAction } from "../lib/useAction";

export function Forgot() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const { busy, error, setError, run } = useAction();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return setError(FIELD_COPY.needEmail);
    void run(async () => {
      await forgotPassword(trimmed);
      navigate(PATHS.reset, { state: { email: trimmed } });
    });
  }

  return (
    <Screen
      title="Forgot password"
      heading="Forgot your password?"
      backTo={PATHS.signIn}
      backLabel="Back to sign in"
      aboveHeading={
        <div className="badge-icon" aria-hidden="true">
          <Lock size={36} strokeWidth={2} />
        </div>
      }
    >
      <p className="lead">
        No problem. Type the email you signed up with and we will send you a code to make a new
        password.
      </p>
      {error && <Alert>{error}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="small">
          Need a hand? A family member or a coordinator can help you with this.
        </p>
        <Button busy={busy} busyLabel="Sending">
          Send me a code
        </Button>
      </form>
    </Screen>
  );
}
