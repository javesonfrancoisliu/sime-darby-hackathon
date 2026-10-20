import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { useSession } from "@sdh/api-client";

import { readJson, scopedKey, writeJson } from "../lib/storage";

// "Larger text" is a device-only accessibility preference (not saved to the
// account). It reuses the existing `.easy-view` comfort sizing that the elderly
// role gets, so a young resident can opt into bigger text and controls without
// changing roles. Default off; persisted per user in localStorage so it survives
// navigation and reload.

const largeTextKey = scopedKey("tc.largeText");

type LargeTextContextValue = {
  largeText: boolean;
  setLargeText: (next: boolean) => void;
};

const LargeTextContext = createContext<LargeTextContextValue | null>(null);

export function LargeTextProvider({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  const [largeText, setLargeTextState] = useState<boolean>(() =>
    readJson(largeTextKey(userId), false),
  );
  // Re-read from storage when the signed-in user changes, so the preference is
  // per person. Adjusting state during render (React's recommended pattern)
  // avoids a setState-in-effect and shows the right value on the first paint.
  const [lastUserId, setLastUserId] = useState(userId);
  if (userId !== lastUserId) {
    setLastUserId(userId);
    setLargeTextState(readJson(largeTextKey(userId), false));
  }

  const setLargeText = useCallback(
    (next: boolean) => {
      setLargeTextState(next);
      writeJson(largeTextKey(userId), next);
    },
    [userId],
  );

  const value = useMemo(() => ({ largeText, setLargeText }), [largeText, setLargeText]);

  return <LargeTextContext.Provider value={value}>{children}</LargeTextContext.Provider>;
}

export function useLargeText(): LargeTextContextValue {
  const ctx = useContext(LargeTextContext);
  if (!ctx) throw new Error("useLargeText must be used within a LargeTextProvider");
  return ctx;
}
