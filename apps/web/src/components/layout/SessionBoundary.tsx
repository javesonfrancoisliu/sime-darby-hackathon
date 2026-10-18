import { Fragment, type ReactNode } from "react";

import { useSession } from "@sdh/api-client";

import { LoadingState } from "../ui";
import { RoleProvider } from "./RoleContext";

// Feeds the signed-in demo user's role into RoleProvider (young when signed out).
export function SessionRoleProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  return (
    <RoleProvider role={user?.role === "elder" ? "elderly" : "young"}>{children}</RoleProvider>
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
  const { status } = useSession();
  if (status === "loading") return <LoadingState rows={2} label="Signing in" />;
  return children;
}
