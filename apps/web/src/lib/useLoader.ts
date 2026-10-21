import { useCallback, useEffect, useRef, useState } from "react";

export type Loaded<T> = { scope: string | null; value: T };

// How often a visible, opted-in list asks again, so new items appear without a manual reload.
export const LIVE_REFRESH_MS = 30_000;
// Focus and visibility events often arrive together; one reload is enough.
const MIN_REFRESH_GAP_MS = 2_000;

// Runs `load` for the given scope (the signed-in user id, or null) on mount and
// whenever the scope changes, and again on `reload`. A slower older reply never
// overwrites a newer one. `load` must be a stable function that does not throw.
// With `refreshMs` it also reloads on that interval and when the tab regains focus, only while visible.
export function useLoader<T>(
  scope: string | null,
  load: (scope: string | null) => Promise<T>,
  enabled = true,
  refreshMs?: number,
): { loaded: Loaded<T> | null; reload: () => Promise<void> } {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const latest = useRef(0);
  const lastRun = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) return;
    latest.current += 1;
    lastRun.current = Date.now();
    const ticket = latest.current;
    const value = await load(scope);
    if (ticket === latest.current) setLoaded({ scope, value });
  }, [scope, load, enabled]);

  useEffect(() => {
    void reload();
    return () => {
      latest.current += 1;
    };
  }, [reload]);

  useEffect(() => {
    if (!enabled || !refreshMs) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRun.current < MIN_REFRESH_GAP_MS) return;
      void reload();
    };
    const timer = setInterval(refresh, refreshMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled, refreshMs, reload]);

  return { loaded, reload };
}
