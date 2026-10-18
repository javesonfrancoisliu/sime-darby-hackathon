import { useEffect, useState } from "react";
import type { DemoUser, DemoUsersResponse } from "@sdh/contracts";
import { apiFetch, useSession } from "@sdh/api-client";
import { logApiError } from "../api/errors";
import { Banner } from "../ui/Banner";
import { IconChevronRight, IconMapPin, IconUser } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; users: DemoUser[] };

// First screen on a new phone: one big card per resident.
export function WhoIsUsingPage() {
  const { signIn } = useSession();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DemoUsersResponse>("/api/demo/users?role=elder", { userId: null })
      .then((res) => {
        if (!cancelled) setLoad({ status: "ready", users: res.users });
      })
      .catch((err: unknown) => {
        logApiError(err);
        if (!cancelled) setLoad({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setLoad({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  return (
    <div className="apple-subpage">
      <h1 className="ui-page-title">Who is using this phone?</h1>
      <p className="ui-page-subtitle app-page-lead">Touch your name to begin.</p>

      {load.status === "loading" ? <Spinner label="Loading names" /> : null}
      {load.status === "error" ? (
        <Banner
          message="We could not load the list of names. Please check the internet and try again."
          onRetry={retry}
        />
      ) : null}
      {load.status === "ready" && load.users.length === 0 ? (
        <p className="ui-page-subtitle app-page-lead">No names are set up yet.</p>
      ) : null}
      {load.status === "ready" && load.users.length > 0 ? (
        <div className="ui-stack">
          {load.users.map((person) => (
            <button
              key={person.id}
              type="button"
              className="category-choice-card person-card"
              onClick={() => signIn(person.id)}
            >
              <div className="category-choice-card__icon" aria-hidden="true">
                <IconUser size={28} strokeWidth={1.8} />
              </div>
              <div className="category-choice-card__content">
                <span className="category-choice-card__title">{person.name}</span>
                <span className="category-choice-card__desc">
                  <IconMapPin className="icon-inline-low"
                    size={14}
                    strokeWidth={2}
                  />
                  {person.area}
                </span>
              </div>
              <span className="category-choice-card__arrow" aria-hidden="true">
                <IconChevronRight size={20} strokeWidth={2} />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
