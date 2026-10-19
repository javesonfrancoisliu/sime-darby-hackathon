import { useCallback } from "react";

import { apiFetch, errorMessage, useSession } from "@sdh/api-client";

import { useLoader } from "../lib/useLoader";

type Result<T> = { data: T | null; error: string | null };

export type ApiResource<T> = {
  data: T | null;
  // True until the first reply for the current user arrives.
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

// Loads one GET path for the signed-in user (or anonymously) and keeps the last reply on screen while it reloads.
// Pass a null path to stay idle, e.g. when the screen needs a signed-in user and there is none.
export function useApiResource<T>(path: string | null): ApiResource<T> {
  const { userId } = useSession();
  const load = useCallback(
    async (scope: string | null): Promise<Result<T>> => {
      if (path === null) return { data: null, error: null };
      try {
        return { data: await apiFetch<T>(path, { userId: scope }), error: null };
      } catch (err) {
        return { data: null, error: errorMessage(err) };
      }
    },
    [path],
  );
  const { loaded, reload } = useLoader(userId, load, path !== null);
  const ready = loaded !== null && loaded.scope === userId ? loaded.value : null;
  return {
    data: ready?.data ?? null,
    loading: path !== null && ready === null,
    error: ready?.error ?? null,
    reload,
  };
}
