import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { ApiError, apiFetch, useSession } from "@sdh/api-client";
import { MAX_NAME_LENGTH, type Precinct, type SelfRole, type User } from "@sdh/contracts";

import { Field } from "../components/Field";
import { Alert, Button, PrecinctPills } from "../components/Parts";
import { Screen } from "../components/Screen";
import { FIELD_COPY, PATHS, ROLE_LABEL } from "../lib/constants";
import { clearPending, readPending, toCreateMeBody } from "../lib/pending";
import { useAction } from "../lib/useAction";
import { useSessionRedirect } from "../lib/useSessionRedirect";

const CONFLICT_STATUS = 409;
const ROLES: SelfRole[] = ["elder", "volunteer"];

// For people who confirmed their email but never saved a profile.
export function Finish() {
  const { status, refresh } = useSession();
  const [initial] = useState(readPending);
  const [role, setRole] = useState<SelfRole | undefined>(initial.role);
  const [name, setName] = useState(initial.name ?? "");
  const [precinct, setPrecinct] = useState<Precinct | undefined>(initial.precinct);
  const [done, setDone] = useState(false);
  const { busy, error, setError, run } = useAction();

  useSessionRedirect({ enabled: true, next: null, onFinish: true });

  if (status === "signed_out") return <Navigate to={PATHS.signIn} replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!role) return setError(FIELD_COPY.needRole);
    if (!name.trim()) return setError(FIELD_COPY.needName);
    if (!precinct) return setError(FIELD_COPY.needArea);
    const body = toCreateMeBody({ role, name, precinct });
    if (!body) return setError(FIELD_COPY.needName);
    void run(async () => {
      try {
        await apiFetch<User>("/api/me", { method: "POST", body });
      } catch (err) {
        // Already created: just reload the session below.
        if (!(err instanceof ApiError && err.status === CONFLICT_STATUS)) throw err;
      }
      clearPending();
      setDone(true);
      refresh();
    });
  }

  return (
    <Screen title="Finish setting up" heading="Finish setting up your account">
      <p className="lead">Tell us a little about you so we can show you the right app.</p>
      {error && <Alert>{error}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <fieldset className="pills">
          <legend className="field__label">Who is this account for?</legend>
          <div className="pills__row">
            {ROLES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={role === option}
                className={`pill${role === option ? " pill--on" : ""}`}
                onClick={() => setRole(option)}
              >
                {ROLE_LABEL[option]}
              </button>
            ))}
          </div>
        </fieldset>
        <Field
          label="Your name"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          placeholder="What neighbours call you"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <PrecinctPills value={precinct} onChange={setPrecinct} />
        <Button busy={busy || done} busyLabel="Saving">
          Finish
        </Button>
      </form>
    </Screen>
  );
}
