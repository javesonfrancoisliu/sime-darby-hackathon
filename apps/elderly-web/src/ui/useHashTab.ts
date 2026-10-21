import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// The tab named in the URL hash (for example /safety#temp), else the fallback. Choosing a tab
// writes it to the hash, and a hash change on the same page switches the tab.
export function useHashTab<T extends string>(valid: readonly T[], fallback: T) {
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();
  const fromHash = useCallback((h: string) => valid.find((tab) => `#${tab}` === h), [valid]);
  const [tab, setTabState] = useState<T>(() => fromHash(hash) ?? fallback);
  const [seenHash, setSeenHash] = useState(hash);

  // A new hash on the same page switches the tab; an unknown hash leaves it alone.
  if (hash !== seenHash) {
    setSeenHash(hash);
    const named = fromHash(hash);
    if (named) setTabState(named);
  }

  const setTab = useCallback(
    (next: T) => {
      setTabState(next);
      navigate({ pathname, search, hash: `#${next}` }, { replace: true });
    },
    [navigate, pathname, search],
  );

  return [tab, setTab] as const;
}
