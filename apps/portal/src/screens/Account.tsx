import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Check, ChevronRight, LogOut } from "lucide-react";

import { GENERIC_ERROR_COPY, useSession } from "@sdh/api-client";
import { getAccountEmail, homePathForRole, signInUrl } from "@sdh/auth";

import { Alert, Button, Notice } from "../components/Parts";
import { Screen } from "../components/Screen";
import { PATHS, ROLE_LABEL } from "../lib/constants";
import { navigateToApp } from "../lib/navigate";

function ChangeRow({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <li className="rows__item">
      <Link to={to} className="row-link">
        <span className="row-link__body">
          <span className="row-link__label">{label}</span>
          {children}
        </span>
        <span className="row-link__action">Change</span>
        <ChevronRight aria-hidden="true" size={22} strokeWidth={2.25} />
      </Link>
    </li>
  );
}

type AccountEmail = { email: string; emailVerified: boolean } | "failed" | null;

export function Account() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const { status, user, refresh, signOut } = useSession();
  const [account, setAccount] = useState<AccountEmail>(null);
  const [signingOut, setSigningOut] = useState(false);
  const signedIn = status === "signed_in";

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    getAccountEmail()
      .then((value) => {
        if (!cancelled) setAccount(value);
      })
      .catch(() => {
        if (!cancelled) setAccount("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  async function onSignOut() {
    setSigningOut(true);
    await signOut();
    navigateToApp(PATHS.signIn);
  }

  if (status === "signed_out") return <Navigate to={signInUrl(PATHS.account)} replace />;
  if (status === "profile_required") return <Navigate to={PATHS.finish} replace />;

  if (status === "error") {
    return (
      <Screen title="Your account" heading="Your account" tone="grey">
        <Alert>{GENERIC_ERROR_COPY}</Alert>
        <Button type="button" onClick={refresh}>
          Try again
        </Button>
      </Screen>
    );
  }

  if (!signedIn || !user) {
    return (
      <Screen title="Your account" heading="Your account" tone="grey">
        <p className="lead">One moment please.</p>
      </Screen>
    );
  }

  const home = homePathForRole(user.role);

  return (
    <Screen title="Your account" backTo={home} backLabel="Back" tone="grey" inlineHeading>
      {notice && <Notice>{notice}</Notice>}
      <ul className="rows">
        <ChangeRow to={PATHS.accountName} label="Name">
          <span className="row-link__value">{user.name}</span>
        </ChangeRow>
        <ChangeRow to={PATHS.accountEmail} label="Email">
          {account === null && <span className="row-link__value">Loading</span>}
          {account === "failed" && <span className="row-link__value">Not available right now</span>}
          {account && account !== "failed" && (
            <>
              <span className="row-link__value">{account.email}</span>
              {account.emailVerified && (
                <span className="row-link__ok">
                  <Check aria-hidden="true" size={16} strokeWidth={3} />
                  Confirmed
                </span>
              )}
            </>
          )}
        </ChangeRow>
        <ChangeRow to={PATHS.accountPassword} label="Password">
          <span className="row-link__value row-link__value--dots" aria-label="Hidden">
            ••••••••
          </span>
        </ChangeRow>
        <li className="rows__item rows__static">
          <span className="row-link__label">Role</span>
          <span className="role-pill">{ROLE_LABEL[user.role]}</span>
          <span className="small">
            Your role comes with your account. To change it, ask a coordinator.
          </span>
        </li>
      </ul>
      <ul className="rows">
        <li className="rows__item rows__static">
          <span className="row-link__label">Area</span>
          <span className="row-link__value">{user.area}</span>
        </li>
      </ul>
      <div className="stack">
        <a href={home} className="btn btn--primary">
          Back to my app
        </a>
        <button
          type="button"
          className="btn btn--outline"
          disabled={signingOut}
          onClick={onSignOut}
        >
          <LogOut aria-hidden="true" size={24} />
          Sign out
        </button>
      </div>
    </Screen>
  );
}
