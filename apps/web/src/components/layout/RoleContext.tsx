import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

export type Role = "young" | "elderly";

type RoleContextValue = {
  role: Role;
  /**
   * Larger-text comfort sizing (design system "Easy View": body 18px+, taller
   * controls). Enabled for the elderly role. Applied via the .easy-view class.
   */
  easyView: boolean;
  /**
   * Elderly confirms before performing actions (extra reassurance for older
   * residents). Young gets a snappier success-after-action flow instead.
   */
  confirmActions: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

function isRole(value: string | null | undefined): value is Role {
  return value === "young" || value === "elderly";
}

/**
 * Dev-only role override, so both roles can be previewed without shipping a
 * production toggle. Checked ONLY in dev builds (import.meta.env.DEV):
 *   - URL query:   ?role=elderly
 *   - Env var:     VITE_DEV_ROLE=elderly  (in apps/web/.env.local)
 * In production this always returns null and the provided default is used.
 */
function devRoleOverride(): Role | null {
  if (!import.meta.env.DEV) return null;
  if (typeof window !== "undefined") {
    const fromQuery = new URLSearchParams(window.location.search).get("role");
    if (isRole(fromQuery)) return fromQuery;
  }
  const fromEnv = import.meta.env.VITE_DEV_ROLE as string | undefined;
  if (isRole(fromEnv)) return fromEnv;
  return null;
}

/**
 * Shared resident-role mode. The role drives which features/emphasis appear and
 * the elderly comfort sizing, so the whole app reads from this one source.
 *
 * There is no in-app role toggle — the role comes from role-based authentication.
 * Until auth is wired, `role` defaults to "young"; when auth lands, feed the
 * authenticated user's role into the `role` prop and nothing downstream changes.
 * A dev-only override (see devRoleOverride) allows previewing elderly.
 */
export function RoleProvider({ role = "young", children }: { role?: Role; children: ReactNode }) {
  const effectiveRole = devRoleOverride() ?? role;

  useEffect(() => {
    document.documentElement.dataset.role = effectiveRole;
  }, [effectiveRole]);

  const value = useMemo<RoleContextValue>(
    () => ({
      role: effectiveRole,
      easyView: effectiveRole === "elderly",
      confirmActions: effectiveRole === "elderly",
    }),
    [effectiveRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
