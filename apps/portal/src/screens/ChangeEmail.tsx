import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Info } from "lucide-react";

import { useSession } from "@sdh/api-client";
import { changeEmail, getAccountEmail, signIn } from "@sdh/auth";

import { Field, PasswordField } from "../components/Field";
import { Alert, Button, LinkButton } from "../components/Parts";
import { Screen } from "../components/Screen";
import { FIELD_COPY, PATHS } from "../lib/constants";
import { useAction } from "../lib/useAction";

export function ChangeEmail() {
  const navigate = useNavigate();
  const { status } = useSession();
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, setError, run } = useAction();
  const signedIn = status === "signed_in";

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    getAccountEmail()
      .then((value) => {
        if (!cancelled) setCurrentEmail(value.email);
      })
      .catch(() => {
        // The current address is only shown for comfort; the password check below reports real problems.
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (status === "signed_out") return <Navigate to={PATHS.signIn} replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const target = newEmail.trim();
    if (!target) return setError(FIELD_COPY.needEmail);
    if (!password) return setError(FIELD_COPY.needPassword);
    if (target.toLowerCase() === currentEmail?.toLowerCase()) return setError(FIELD_COPY.sameEmail);
    void run(async () => {
      // Check it is really them before anything changes.
      const current = currentEmail ?? (await getAccountEmail()).email;
      await signIn(current, password);
      await changeEmail(target);
      navigate(PATHS.accountEmailVerify, { state: { email: target } });
    });
  }

  return (
    <Screen
      title="Change email"
      backTo={PATHS.account}
      backLabel="Back to your account"
      inlineHeading
    >
      {currentEmail && (
        <p className="lead">
          Now: <strong>{currentEmail}</strong>
        </p>
      )}
      {error && <Alert>{error}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field
          label="New email"
          type="email"
          autoComplete="email"
          placeholder="new@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <PasswordField
          label="Your password"
          autoComplete="current-password"
          placeholder="To check it is really you"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="info-box">
          <Info aria-hidden="true" size={24} strokeWidth={2} />
          <p>
            We will send a code to the new email. Your current email keeps working until you type
            that code.
          </p>
        </div>
        <Button busy={busy} busyLabel="Sending">
          Send code to new email
        </Button>
        <LinkButton to={PATHS.account}>Cancel</LinkButton>
      </form>
    </Screen>
  );
}
