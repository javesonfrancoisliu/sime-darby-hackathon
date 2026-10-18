import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { VerificationStatus } from "../types/volunteer";
import type { ProfilePrefs } from "../types/profile";
import { DEMO_TOWNSHIP } from "../lib/township";
import { useSession } from "@sdh/api-client";
import { readJson, scopedKey, writeJson } from "../lib/storage";

// Reusable, localStorage-backed Young-resident profile state. Held once at the
// app root so every component sees the same values; persisted so edits survive
// navigation and reload. FRONTEND-ONLY / demo — nothing here is saved to a
// backend, and the toggles do NOT enforce real privacy or push notifications.

const prefsKey = scopedKey("tc.profile.prefs");
const settingsKey = scopedKey("tc.profile.settings");

/** Mock notification/privacy toggles. Demo only — no real enforcement. */
export type ProfileSettings = {
  notifyEvents: boolean;
  notifyVolunteering: boolean;
  shareApproxLocation: boolean;
  showOnLeaderboard: boolean;
};

const DEFAULT_PREFS: ProfilePrefs = {
  displayName: "Alex Tan",
  area: DEMO_TOWNSHIP.name,
  skills: ["groceries", "digital_literacy"],
  interests: ["community_activity"],
  availability: { days: ["weekends"], times: ["morning"] },
  languages: ["en", "ms"],
};

const DEFAULT_SETTINGS: ProfileSettings = {
  notifyEvents: true,
  notifyVolunteering: true,
  shareApproxLocation: true,
  showOnLeaderboard: true,
};

// Verification shown when signed out (demo). Signed in, it comes from the API user.
const DEMO_VERIFICATION: VerificationStatus = "verified";

function readMerged<T extends object>(key: string, fallback: T): T {
  return { ...fallback, ...readJson<Partial<T>>(key, {}) };
}

export type ProfileContextValue = {
  prefs: ProfilePrefs;
  settings: ProfileSettings;
  verification: VerificationStatus;
  updatePrefs: (patch: Partial<ProfilePrefs>) => void;
  updateSettings: (patch: Partial<ProfileSettings>) => void;
  reset: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, userId } = useSession();
  const verification: VerificationStatus = user ? user.verification : DEMO_VERIFICATION;
  const [prefs, setPrefs] = useState<ProfilePrefs>(() =>
    readMerged(prefsKey(userId), DEFAULT_PREFS),
  );
  const [settings, setSettings] = useState<ProfileSettings>(() =>
    readMerged(settingsKey(userId), DEFAULT_SETTINGS),
  );

  useEffect(() => writeJson(prefsKey(userId), prefs), [userId, prefs]);
  useEffect(() => writeJson(settingsKey(userId), settings), [userId, settings]);

  const updatePrefs = useCallback((patch: Partial<ProfilePrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateSettings = useCallback((patch: Partial<ProfileSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      prefs,
      settings,
      verification,
      updatePrefs,
      updateSettings,
      reset,
    }),
    [prefs, settings, verification, updatePrefs, updateSettings, reset],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
