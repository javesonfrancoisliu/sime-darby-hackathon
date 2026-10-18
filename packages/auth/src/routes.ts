import { getAccessToken, signOut } from "./actions";
import { authConfigFromEnv, configureAuth } from "./config";

// Where each app lives on the one shared origin.
export const APP_PATHS = {
  signIn: "/",
  finish: "/finish",
  account: "/account",
  elder: "/elder/",
  volunteer: "/volunteer/",
} as const;

export const NEXT_PARAM = "next";

export type AppRole = "elder" | "volunteer" | "coordinator";

// Coordinators have no app of their own yet, so they land on their account page.
export function homePathForRole(role: AppRole): string {
  if (role === "elder") return APP_PATHS.elder;
  if (role === "volunteer") return APP_PATHS.volunteer;
  return APP_PATHS.account;
}

// Browsers drop tabs and newlines in URLs, so "/\t/evil" would become "//evil"; reject them up front.
const LAST_CONTROL_CHAR = 0x1f;
const DELETE_CHAR = 0x7f;
const PLACEHOLDER_ORIGIN = "https://same-origin.invalid";

function hasUnsafeChar(path: string): boolean {
  for (let i = 0; i < path.length; i += 1) {
    const code = path.charCodeAt(i);
    if (code <= LAST_CONTROL_CHAR || code === DELETE_CHAR || path[i] === "\\") return true;
  }
  return false;
}

// Only same-origin paths are allowed after sign-in, so a crafted link cannot send people elsewhere.
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || hasUnsafeChar(raw)) {
    return null;
  }
  try {
    const url = new URL(raw, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function signInUrl(nextPath?: string): string {
  const next = safeNextPath(nextPath);
  return next ? `${APP_PATHS.signIn}?${NEXT_PARAM}=${encodeURIComponent(next)}` : APP_PATHS.signIn;
}

export type StartedAuth = {
  getAccessToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

// Configures Cognito from the Vite env; undefined means the app runs in local demo mode.
export function startAuthFromEnv(env: Record<string, string | undefined>): StartedAuth | undefined {
  const config = authConfigFromEnv(env);
  if (!config) return undefined;
  configureAuth(config);
  return { getAccessToken, signOut };
}
