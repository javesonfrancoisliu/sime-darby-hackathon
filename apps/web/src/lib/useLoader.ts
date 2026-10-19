import { useCallback, useEffect, useRef, useState } from "react";

export type Loaded<T> = { scope: string | null; value: T };

// Runs `load` for the given scope (the signed-in user id, or null) on mount and
// whenever the scope changes, and again on `reload`. A slower older reply never
// overwrites a newer one. `load` must be a stable function that does not throw.
export function useLoader<T>(
  scope: string | null,
  load: (scope: string | null) => Promise<T>,
  enabled = true,
): { loaded: Loaded<T> | null; reload: () => Promise<void> } {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) return;
    latest.current += 1;
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

  return { loaded, reload };
}
