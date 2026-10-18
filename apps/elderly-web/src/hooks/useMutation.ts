import { useCallback, useRef, useState } from "react";
import { toFriendlyError, type FriendlyError } from "../api/errors";

export type MutationStatus = "idle" | "loading" | "error" | "success";

// Runs one action at a time: a second call while one is still sending is ignored.
// The action must be a stable function. Resolves to undefined when it fails or is ignored.
export function useMutation<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  const [state, setState] = useState<{ status: MutationStatus; error?: FriendlyError }>({
    status: "idle",
  });
  const busy = useRef(false);

  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      if (busy.current) return undefined;
      busy.current = true;
      setState({ status: "loading" });
      try {
        const result = await action(...args);
        setState({ status: "success" });
        return result;
      } catch (error) {
        setState({ status: "error", error: toFriendlyError(error) });
        return undefined;
      } finally {
        busy.current = false;
      }
    },
    [action],
  );

  return { run, status: state.status, error: state.error };
}
