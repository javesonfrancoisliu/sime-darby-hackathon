import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PutSettingsBody, Settings } from "@sdh/contracts";
import { apiFetch, useSession } from "@sdh/api-client";

import { readJson, scopedKey, writeJson } from "../lib/storage";
import { useApiResource } from "./useApiResource";

// "Larger text" reuses the existing `.easy-view` comfort sizing that the elderly
// role gets, so a young resident can opt into bigger text and controls without
// changing roles. It is saved to the account as the settings fontSize ("large"
// when on, "normal" when off) and loaded on sign-in. The copy in localStorage is
// only a fast first paint before the saved value arrives.

const largeTextKey = scopedKey("tc.largeText");

type LargeTextContextValue = {
  largeText: boolean;
  // Rejects with the API error when the change could not be saved; the screen goes back.
  setLargeText: (next: boolean) => Promise<void>;
};

const LargeTextContext = createContext<LargeTextContextValue | null>(null);

export function LargeTextProvider({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  const [cached, setCached] = useState<boolean>(() => readJson(largeTextKey(userId), false));
  // A choice made on this screen wins over the loaded value until the person changes.
  const [chosen, setChosen] = useState<boolean | null>(null);
  // Re-read from storage when the signed-in user changes, so the preference is
  // per person. Adjusting state during render (React's recommended pattern)
  // avoids a setState-in-effect and shows the right value on the first paint.
  const [lastUserId, setLastUserId] = useState(userId);
  if (userId !== lastUserId) {
    setLastUserId(userId);
    setCached(readJson(largeTextKey(userId), false));
    setChosen(null);
  }

  const { data } = useApiResource<Settings>(userId === null ? null : "/api/me/settings");
  const saved = data ? data.fontSize !== "normal" : null;
  const largeText = chosen ?? saved ?? cached;

  // Keep the first-paint copy in step with what the account says.
  useEffect(() => {
    if (saved !== null && chosen === null) writeJson(largeTextKey(userId), saved);
  }, [saved, chosen, userId]);

  const setLargeText = useCallback(
    async (next: boolean) => {
      const previous = largeText;
      setChosen(next);
      writeJson(largeTextKey(userId), next);
      if (userId === null) return;
      try {
        // Read the latest settings first so the other fields are not overwritten.
        const { updatedAt: _updatedAt, ...current } = await apiFetch<Settings>("/api/me/settings", {
          userId,
        });
        void _updatedAt;
        const body: PutSettingsBody = { ...current, fontSize: next ? "large" : "normal" };
        await apiFetch<Settings>("/api/me/settings", { method: "PUT", body, userId });
      } catch (err) {
        setChosen(previous);
        writeJson(largeTextKey(userId), previous);
        throw err;
      }
    },
    [largeText, userId],
  );

  const value = useMemo(() => ({ largeText, setLargeText }), [largeText, setLargeText]);

  return <LargeTextContext.Provider value={value}>{children}</LargeTextContext.Provider>;
}

export function useLargeText(): LargeTextContextValue {
  const ctx = useContext(LargeTextContext);
  if (!ctx) throw new Error("useLargeText must be used within a LargeTextProvider");
  return ctx;
}
