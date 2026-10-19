import { homePathForRole, safeNextPath, type AppRole } from "@sdh/auth";

import { PATHS } from "./constants";

// The account pages live in this app; every other destination is a different app.
export function isPortalPath(path: string): boolean {
  return path === PATHS.account || path.startsWith(`${PATHS.account}/`);
}

// Where to go after sign-in: a safe ?next inside the person's own app (or their account pages), else their home.
export function destinationFor(role: AppRole, rawNext: string | null): string {
  const home = homePathForRole(role);
  const next = safeNextPath(rawNext);
  if (next && (next.startsWith(home) || isPortalPath(next))) return next;
  return home;
}
