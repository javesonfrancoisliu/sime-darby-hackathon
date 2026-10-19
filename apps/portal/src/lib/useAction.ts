import { useCallback, useState } from "react";

import { messageFor } from "./errors";

// Runs one async action with a busy flag and a plain-words error. Anything thrown becomes the message.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
