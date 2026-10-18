import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { User } from "@sdh/contracts";

import { ApiError, apiFetch, DEMO_USER_STORAGE_KEY, storedDemoUserId } from "../lib/api";

// Demo sign-in. The backend identifies callers by an X-Demo-User header holding
// a seeded user id (not real authentication). Choosing a user here switches the
// app from offline demo data to the live API; signing out switches back.

export type SessionStatus = "signed_out" | "loading" | "signed_in" | "error";

export type SessionContextValue = {
  /** Chosen demo user id. Non-null means "live mode": data comes from the API. */
  userId: string | null;
  user: User | null;
  status: SessionStatus;
  error: string | null;
  signIn: (userId: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function persist(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(DEMO_USER_STORAGE_KEY, userId);
    else window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  } catch {
    // Storage blocked (private mode): the session just won't survive a reload.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(storedDemoUserId);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [userId]);

  const signIn = useCallback((id: string) => {
    persist(id);
    setUser(null);
    setError(null);
    setUserId(id);
  }, []);

  const signOut = useCallback(() => {
    persist(null);
    setUser(null);
    setError(null);
    setUserId(null);
  }, []);

  const status: SessionStatus = !userId
    ? "signed_out"
    : user && user.id === userId
      ? "signed_in"
      : error
        ? "error"
        : "loading";

  const value = useMemo<SessionContextValue>(
    () => ({
      userId,
      user: user && user.id === userId ? user : null,
      status,
      error,
      signIn,
      signOut,
    }),
    [userId, user, status, error, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
