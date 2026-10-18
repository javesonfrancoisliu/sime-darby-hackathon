import { useCallback, useEffect, useRef, useState } from "react";
import { toFriendlyError, type FriendlyError } from "../api/errors";

export type QueryStatus = "loading" | "success" | "error";

interface State<T> {
  key: string;
  status: QueryStatus;
  data?: T;
  error?: FriendlyError;
}

// How often screens that show request status ask the server again.
export const REFRESH_INTERVAL_MS = 10_000;

function pageIsHidden(): boolean {
  return document.visibilityState === "hidden";
}

// Loads data and, when intervalMs is given, refreshes it while the page is visible.
// A slow reply that finishes after a newer one is dropped, so old data never wins.
export function useLiveQuery<T>(key: string, load: () => Promise<T>, intervalMs?: number) {
  const [state, setState] = useState<State<T>>({ key, status: "loading" });
  const loadRef = useRef(load);
  const runRef = useRef<() => void>(() => {});
  const sequence = useRef({ started: 0, applied: 0 });

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const run = () => {
      const id = ++sequence.current.started;
      const isStale = () => !active || id < sequence.current.applied;
      loadRef
        .current()
        .then((data) => {
          if (isStale()) return;
          sequence.current.applied = id;
          setState({ key, status: "success", data });
        })
        .catch((error: unknown) => {
          if (isStale()) return;
          sequence.current.applied = id;
          const friendly = toFriendlyError(error);
          // A failed refresh keeps what is already on screen.
          setState((prev) =>
            prev.key === key && prev.data !== undefined
              ? prev
              : { key, status: "error", error: friendly },
          );
        });
    };
    runRef.current = run;

    const startTimer = () => {
      if (intervalMs && timer === undefined) timer = setInterval(run, intervalMs);
    };
    const stopTimer = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    const onVisibilityChange = () => {
      if (pageIsHidden()) {
        stopTimer();
      } else {
        run();
        startTimer();
      }
    };

    run();
    if (!pageIsHidden()) startTimer();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [key, intervalMs]);

  const refetch = useCallback(() => {
    setState((prev) => ({ key: prev.key, status: "loading", data: prev.data }));
    runRef.current();
  }, []);

  const update = useCallback((change: (data: T) => T) => {
    setState((prev) => (prev.data === undefined ? prev : { ...prev, data: change(prev.data) }));
  }, []);

  const current: State<T> = state.key === key ? state : { key, status: "loading" };
  return { data: current.data, status: current.status, error: current.error, refetch, update };
}
