import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { apiFetch, useSession } from "@sdh/api-client";
import { MAX_NAME_LENGTH, UpdateMeBody, type User } from "@sdh/contracts";

import { Field } from "../components/Field";
import { Alert, Button, LinkButton } from "../components/Parts";
import { Screen } from "../components/Screen";
import { FIELD_COPY, NOTICE, PATHS } from "../lib/constants";
import { useAction } from "../lib/useAction";

export function ChangeName() {
  const navigate = useNavigate();
  const { status, user, updateUser } = useSession();
  const [name, setName] = useState("");
  const { busy, error, setError, run } = useAction();

  if (status === "signed_out") return <Navigate to={PATHS.signIn} replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const body = UpdateMeBody.safeParse({ name });
    if (!body.success) return setError(FIELD_COPY.needName);
    void run(async () => {
      const updated = await apiFetch<User>("/api/me", { method: "PATCH", body: body.data });
      updateUser(updated);
      navigate(PATHS.account, { state: { notice: NOTICE.nameChanged } });
    });
  }

  return (
    <Screen
      title="Change name"
      backTo={PATHS.account}
      backLabel="Back to your account"
      inlineHeading
    >
      {user && (
        <p className="lead">
          Now: <strong>{user.name}</strong>. This is the name volunteers and neighbours see.
        </p>
      )}
      {error && <Alert>{error}</Alert>}
      <form className="form" onSubmit={onSubmit} noValidate>
        <Field
          label="New name"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          placeholder="What neighbours call you"
          hint={`Up to ${MAX_NAME_LENGTH} letters.`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button busy={busy} busyLabel="Saving">
          Save name
        </Button>
        <LinkButton to={PATHS.account}>Cancel</LinkButton>
      </form>
    </Screen>
  );
}
