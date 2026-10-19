import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { checkPassword, signUp } from "@sdh/auth";
import { MAX_NAME_LENGTH, type Precinct } from "@sdh/contracts";

import { Field, PasswordField } from "../components/Field";
import { Alert, Button, PasswordRules, PrecinctPills } from "../components/Parts";
import { Screen } from "../components/Screen";
import { FIELD_COPY, PATHS, ROLE_LABEL } from "../lib/constants";
import { useFlow } from "../lib/flow";
import { readPending, savePending } from "../lib/pending";
import { useAction } from "../lib/useAction";

export function SignUpDetails() {
  const navigate = useNavigate();
  const { rememberPassword } = useFlow();
  const [initial] = useState(readPending);
  const [name, setName] = useState(initial.name ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [password, setPassword] = useState("");
  const [precinct, setPrecinct] = useState<Precinct | undefined>(initial.precinct);
  const { busy, error, setError, run } = useAction();

  if (!initial.role) return <Navigate to={PATHS.signUp} replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) return setError(FIELD_COPY.needName);
    if (!trimmedEmail) return setError(FIELD_COPY.needEmail);
    if (!checkPassword(password).ok) return setError(FIELD_COPY.passwordRules);
    if (!precinct) return setError(FIELD_COPY.needArea);
    void run(async () => {
      await signUp(trimmedEmail, password);
      rememberPassword(password);
      savePending({ name: trimmedName, email: trimmedEmail, precinct });
      navigate(PATHS.signUpVerify, { state: { email: trimmedEmail } });
    });
  }

  return (
    <Screen
      title="Create an account"
      heading="About you"
      backTo={PATHS.signUp}
      backLabel="Back to choose role"
      stepLabel="Step 2 of 3"
      step={2}
    >
      <div className="role-line">
        <span className="role-pill">{ROLE_LABEL[initial.role]}</span>
        <Link to={PATHS.signUp} className="link-action">
          Change
        </Link>
      </div>
      {error && <Alert>{error}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field
          label="Your name"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          placeholder="What neighbours call you"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          hint="We send a code here to confirm it is you."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Make a password"
          autoComplete="new-password"
          placeholder="Your new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordRules password={password} />
        <PrecinctPills value={precinct} onChange={setPrecinct} />
        <Button busy={busy} busyLabel="Creating your account">
          Create account
        </Button>
      </form>
    </Screen>
  );
}
