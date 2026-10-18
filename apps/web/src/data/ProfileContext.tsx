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
import { UpdateMeBody, type User } from "@sdh/contracts";
import { apiFetch, useSession } from "@sdh/api-client";
import { preferenceToSlots, slotsToPreference } from "../lib/availability";
import { readJson, scopedKey, writeJson } from "../lib/storage";

// Reusable, localStorage-backed Young-resident profile state. Held once at the
// app root so every component sees the same values; persisted so edits survive
// navigation and reload. FRONTEND-ONLY / demo - nothing here is saved to a
// backend, and the toggles do NOT enforce real privacy or push notifications.

const prefsKey = scopedKey("tc.profile.prefs");
const settingsKey = scopedKey("tc.profile.settings");

// Mock notification/privacy toggles. Demo only - no real enforcement.
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
  // Signed in, name, area, skills and availability come from the API user.
  prefs: ProfilePrefs;
  // True while the signed-out demo profile is shown.
  isDemo: boolean;
  settings: ProfileSettings;
  verification: VerificationStatus;
  // Signed in, saves to PATCH /api/me and rejects with the API error.
  updatePrefs: (patch: Partial<ProfilePrefs>) => Promise<void>;
  updateSettings: (patch: Partial<ProfileSettings>) => void;
  reset: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, userId, updateUser } = useSession();
  const verification: VerificationStatus = user ? user.verification : DEMO_VERIFICATION;
  const [localPrefs, setLocalPrefs] = useState<ProfilePrefs>(() =>
    readMerged(prefsKey(userId), DEFAULT_PREFS),
  );
  const [settings, setSettings] = useState<ProfileSettings>(() =>
    readMerged(settingsKey(userId), DEFAULT_SETTINGS),
  );

  useEffect(() => writeJson(prefsKey(userId), localPrefs), [userId, localPrefs]);
  useEffect(() => writeJson(settingsKey(userId), settings), [userId, settings]);

  const prefs = useMemo<ProfilePrefs>(
    () =>
      user
        ? {
            ...localPrefs,
            displayName: user.name,
            area: user.area,
            skills: user.skills,
            availability: slotsToPreference(user.availability),
          }
        : localPrefs,
    [user, localPrefs],
  );

  const updatePrefs = useCallback(
    async (patch: Partial<ProfilePrefs>) => {
      if (user) {
        const body: UpdateMeBody = {};
        if (patch.displayName !== undefined) body.name = patch.displayName;
        if (patch.area !== undefined) body.area = patch.area;
        if (patch.skills !== undefined) body.skills = patch.skills;
        if (patch.availability !== undefined) {
          body.availability = preferenceToSlots(patch.availability);
        }
        if (Object.keys(body).length > 0) {
          const saved = await apiFetch<User>("/api/me", {
            method: "PATCH",
            body: UpdateMeBody.parse(body),
            userId: user.id,
          });
          updateUser(saved);
        }
        // Interests and languages are not part of the API profile; keep them on this device.
        const { interests, languages } = patch;
        if (interests !== undefined || languages !== undefined) {
          setLocalPrefs((prev) => ({
            ...prev,
            ...(interests !== undefined && { interests }),
            ...(languages !== undefined && { languages }),
          }));
        }
        return;
      }
      setLocalPrefs((prev) => ({ ...prev, ...patch }));
    },
    [user, updateUser],
  );

  const updateSettings = useCallback((patch: Partial<ProfileSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setLocalPrefs(DEFAULT_PREFS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      prefs,
      isDemo: user === null,
      settings,
      verification,
      updatePrefs,
      updateSettings,
      reset,
    }),
    [prefs, user, settings, verification, updatePrefs, updateSettings, reset],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
