import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { User } from "@sdh/contracts";

import { ApiError, apiFetch } from "./fetch";
import { clearScopedKeys, DEMO_USER_STORAGE_KEY, storedDemoUserId, writeStorage } from "./storage";

// Demo sign-in. The backend identifies callers by an X-Demo-User header holding
// a seeded user id (not real authentication). Choosing a user here switches the
// app from offline demo data to the live API; signing out switches back.

// "profile_required" only occurs in token mode: signed in, but no profile row exists yet.
export type SessionStatus = "signed_out" | "loading" | "signed_in" | "profile_required" | "error";

// Token mode: identity comes from a Cognito access token instead of the demo header.
export type SessionAuth = {
  getAccessToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

export type SessionContextValue = {
  // Chosen demo user id. Non-null means "live mode": data comes from the API.
  userId: string | null;
  user: User | null;
  status: SessionStatus;
  error: string | null;
  // Demo mode only; in token mode sign-in happens in @sdh/auth, then call refresh().
  signIn: (userId: string) => void;
  signOut: () => void | Promise<void>;
  // Replaces the loaded user with a fresher copy, e.g. the reply to PATCH /api/me.
  updateUser: (user: User) => void;
  // Reloads /api/me, e.g. after the profile is created.
  refresh: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// While the profile could not be loaded, ask again this often and when the tab regains focus.
export const SESSION_RETRY_MS = 30_000;

// Clears an "error" session on its own once the API is back, so no manual reload is needed.
function useRetryWhileError(status: SessionStatus, refresh: () => void) {
  useEffect(() => {
    if (status !== "error") return;
    const retry = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(retry, SESSION_RETRY_MS);
    document.addEventListener("visibilitychange", retry);
    window.addEventListener("focus", retry);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", retry);
      window.removeEventListener("focus", retry);
    };
  }, [status, refresh]);
}

function persist(userId: string | null) {
  writeStorage(DEMO_USER_STORAGE_KEY, userId);
}

export function SessionProvider({ children, auth }: { children: ReactNode; auth?: SessionAuth }) {
  return auth ? (
    <TokenSessionProvider auth={auth}>{children}</TokenSessionProvider>
  ) : (
    <DemoSessionProvider>{children}</DemoSessionProvider>
  );
}

function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(storedDemoUserId);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    apiFetch<User>("/api/me", { userId })
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "UNAUTHENTICATED") {
          // The stored user no longer exists (e.g. the table was reseeded).
          persist(null);
          clearScopedKeys();
          setUserId(null);
          setUser(null);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : "Could not load your profile.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  const signIn = useCallback((id: string) => {
    persist(id);
    setUser(null);
    setError(null);
    setUserId(id);
  }, []);

  const signOut = useCallback(() => {
    persist(null);
    clearScopedKeys();
    setUser(null);
    setError(null);
    setUserId(null);
  }, []);

  const updateUser = useCallback((next: User) => {
    setUser((current) => (current && current.id === next.id ? next : current));
  }, []);

  const status: SessionStatus = !userId
    ? "signed_out"
    : user && user.id === userId
      ? "signed_in"
      : error
        ? "error"
        : "loading";
  useRetryWhileError(status, refresh);

  const value = useMemo<SessionContextValue>(
    () => ({
      userId,
      user: user && user.id === userId ? user : null,
      status,
      error,
      signIn,
      signOut,
      updateUser,
      refresh,
    }),
    [userId, user, status, error, signIn, signOut, updateUser, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

type TokenSessionState = { user: User | null; status: SessionStatus; error: string | null };

async function readTokenSession(auth: SessionAuth): Promise<TokenSessionState> {
  try {
    const token = await auth.getAccessToken();
    if (!token) return { user: null, status: "signed_out", error: null };
    const me = await apiFetch<User>("/api/me");
    return { user: me, status: "signed_in", error: null };
  } catch (err: unknown) {
    if (err instanceof ApiError && err.code === "PROFILE_REQUIRED") {
      return { user: null, status: "profile_required", error: null };
    }
    if (err instanceof ApiError && err.code === "UNAUTHENTICATED") {
      return { user: null, status: "signed_out", error: null };
    }
    return {
      user: null,
      status: "error",
      error: err instanceof Error ? err.message : "Could not load your profile.",
    };
  }
}

function TokenSessionProvider({ children, auth }: { children: ReactNode; auth: SessionAuth }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const authRef = useRef(auth);
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);
  // Each load takes a ticket so a slow earlier reply cannot overwrite a newer one.
  const ticketRef = useRef(0);

  const load = useCallback(() => {
    ticketRef.current += 1;
    const ticket = ticketRef.current;
    void readTokenSession(authRef.current).then((next) => {
      if (ticket !== ticketRef.current) return;
      setUser(next.user);
      setError(next.error);
      setStatus(next.status);
    });
  }, []);

  useEffect(() => {
    load();
    return () => {
      // Invalidates any load still in flight when the provider unmounts.
      ticketRef.current += 1;
    };
  }, [load]);

  const signIn = useCallback(() => {
    // Token mode signs in through @sdh/auth; the app then calls refresh().
  }, []);

  const signOut = useCallback(async () => {
    ticketRef.current += 1;
    try {
      await authRef.current.signOut();
    } catch {
      // The app still ends the session locally below.
    }
    clearScopedKeys();
    setUser(null);
    setError(null);
    setStatus("signed_out");
  }, []);

  const updateUser = useCallback((next: User) => {
    setUser((current) => (current && current.id === next.id ? next : current));
  }, []);

  const refresh = load;
  useRetryWhileError(status, refresh);

  const value = useMemo<SessionContextValue>(
    () => ({
      userId: user?.id ?? null,
      user,
      status,
      error,
      signIn,
      signOut,
      updateUser,
      refresh,
    }),
    [user, status, error, signIn, signOut, updateUser, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
