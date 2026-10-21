import { LogIn, LogOut, UserRoundCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { DemoUser, DemoUsersResponse } from "@sdh/contracts";

import { apiFetch, errorMessage, useSession } from "@sdh/api-client";
import { AppButton, InfoCard, StatusBadge } from "../ui";

const ROLE_LABEL: Record<DemoUser["role"], string> = {
  volunteer: "Volunteer",
  elder: "Resident",
  coordinator: "Coordinator",
};

// Local sign-in: pick one of the seeded users. This picks an identity for the
// X-Demo-User header - it is NOT authentication.
export function DemoSignInCard() {
  const { user, userId, status, signIn, signOut, refresh } = useSession();
  const labelId = useId();
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choice, setChoice] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<DemoUsersResponse>("/api/demo/users", { userId: null })
      .then((res) => {
        if (cancelled) return;
        // This app covers residents and volunteers; coordinators have no screens here.
        const pickable = res.users.filter((u) => u.role !== "coordinator");
        setUsers(pickable);
        setChoice((prev) => prev || pickable.find((u) => u.role === "volunteer")?.id || "");
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="ui-section" aria-label="Local sign-in">
      <InfoCard>
        <div className="feature-card">
          <div className="feature-card-head">
            <h2 className="feature-card-title">
              <span className="inline-icon">
                <UserRoundCheck size={18} aria-hidden="true" />
                Local sign-in
              </span>
            </h2>
            <StatusBadge
              label={status === "signed_in" ? "Signed in" : userId ? "Not loaded" : "Signed out"}
              variant={status === "signed_in" ? "success" : userId ? "warning" : "info"}
            />
          </div>

          {userId ? (
            <>
              <p className="ui-helper ui-flush-top">
                {status === "signed_in" && user
                  ? `Signed in as ${user.name} (${ROLE_LABEL[user.role]}, ${user.area}).`
                  : status === "error"
                    ? "We could not load this. Check your connection and try again."
                    : "Signing in…"}
              </p>
              <div className="feature-card-foot">
                {status === "error" && <AppButton onClick={refresh}>Try again</AppButton>}
                <AppButton variant="secondary" onClick={signOut}>
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </AppButton>
              </div>
            </>
          ) : loadError ? (
            <p className="ui-helper ui-flush-top">
              The service isn't reachable ({loadError}). Please try again in a moment.
            </p>
          ) : users === null ? (
            <p className="ui-helper ui-flush-top">Looking for people to sign in as…</p>
          ) : users.length === 0 ? (
            <p className="ui-helper ui-flush-top">
              No people are set up yet. Please ask the team to add them.
            </p>
          ) : (
            <>
              <p className="ui-helper ui-flush-top">Choose a person to sign in as.</p>
              <span className="ui-label" id={labelId}>
                Sign in as
              </span>
              <div className="ui-chip-row" role="group" aria-labelledby={labelId}>
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="ui-chip"
                    aria-pressed={choice === u.id}
                    onClick={() => setChoice(u.id)}
                  >
                    {u.name} - {ROLE_LABEL[u.role]}
                    {u.role === "volunteer" && u.verification !== "verified"
                      ? ` (${u.verification})`
                      : ""}
                  </button>
                ))}
              </div>
              <div className="feature-card-foot">
                <AppButton variant="primary" disabled={!choice} onClick={() => signIn(choice)}>
                  <LogIn size={16} aria-hidden="true" />
                  Sign in
                </AppButton>
              </div>
            </>
          )}
        </div>
      </InfoCard>
    </section>
  );
}
