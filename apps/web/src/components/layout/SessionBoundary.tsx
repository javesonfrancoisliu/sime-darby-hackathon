import { Fragment, type ReactNode } from "react";

import { useSession } from "@sdh/api-client";

import { tokenModeEnabled } from "../../lib/authMode";
import { useSessionRedirect } from "../../lib/sessionRedirect";
import { AppButton, EmptyState, LoadingState } from "../ui";
import { RoleProvider } from "./RoleContext";

// Feeds the signed-in demo user's role into RoleProvider (young when signed out).
// The dev role preview only applies while signed out.
export function SessionRoleProvider({ children }: { children: ReactNode }) {
  const { user, userId } = useSession();
  return (
    <RoleProvider role={user?.role === "elder" ? "elderly" : "young"} allowPreview={!userId}>
      {children}
    </RoleProvider>
  );
}

// Remounts the per-user providers when the signed-in user changes, so one
// person's points, tasks and profile are never carried over to the next.
export function UserScope({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  return <Fragment key={userId ?? "signed-out"}>{children}</Fragment>;
}

// Shows a loading state inside the app shell while the signed-in user loads, so
// an elder never briefly gets the young screens and a slow API never hides the nav.
export function SessionGate({ children }: { children: ReactNode }) {
  return tokenModeEnabled() ? (
    <TokenSessionGate>{children}</TokenSessionGate>
  ) : (
    <DemoSessionGate>{children}</DemoSessionGate>
  );
}

function DemoSessionGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === "loading") return <LoadingState rows={2} label="Signing in" />;
  return children;
}

// Real sign-in: anyone who is not a signed-in volunteer is sent to the right page.
function TokenSessionGate({ children }: { children: ReactNode }) {
  const { status, refresh } = useSession();
  const redirecting = useSessionRedirect();
  if (status === "loading" || redirecting) return <LoadingState rows={2} label="Signing in" />;
  if (status === "error") {
    return (
      <EmptyState
        title="We could not load your details"
        description="Please check the internet and try again."
        action={<AppButton onClick={refresh}>Try again</AppButton>}
      />
    );
  }
  return children;
}
