import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import type { VerificationStatus } from "../types/volunteer";
import type { ProfilePrefs } from "../types/profile";
import { UpdateMeBody, type User } from "@sdh/contracts";
import { apiFetch, useSession } from "@sdh/api-client";
import { preferenceToSlots, slotsToPreference } from "../lib/availability";

// The signed-in person's profile, read from the session user and saved with PATCH /api/me.
// Held once at the app root so every component sees the same values.

const EMPTY_PREFS: ProfilePrefs = {
  displayName: "",
  area: "",
  skills: [],
  interests: [],
  availability: { days: [], times: [] },
  languages: [],
};

export type ProfileContextValue = {
  prefs: ProfilePrefs;
  // Null while nobody is signed in.
  verification: VerificationStatus | null;
  leaderboardOptIn: boolean;
  // Saves to PATCH /api/me and rejects with the API error.
  updatePrefs: (patch: Partial<ProfilePrefs>) => Promise<void>;
  setLeaderboardOptIn: (next: boolean) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useSession();

  const prefs = useMemo<ProfilePrefs>(
    () =>
      user
        ? {
            displayName: user.name,
            area: user.area,
            skills: user.skills,
            interests: user.interests,
            languages: user.languages,
            availability: slotsToPreference(user.availability ?? []),
          }
        : EMPTY_PREFS,
    [user],
  );

  const save = useCallback(
    async (body: UpdateMeBody) => {
      if (!user) return;
      const checked = UpdateMeBody.safeParse(body);
      if (!checked.success) {
        throw new Error(
          "Some of those details are too long or missing. Please check and try again.",
        );
      }
      const saved = await apiFetch<User>("/api/me", {
        method: "PATCH",
        body: checked.data,
        userId: user.id,
      });
      updateUser(saved);
    },
    [user, updateUser],
  );

  const updatePrefs = useCallback(
    async (patch: Partial<ProfilePrefs>) => {
      const body: UpdateMeBody = {};
      if (patch.displayName !== undefined) body.name = patch.displayName;
      if (patch.area !== undefined) body.area = patch.area;
      if (patch.skills !== undefined) body.skills = patch.skills;
      if (patch.interests !== undefined) body.interests = patch.interests;
      if (patch.languages !== undefined) body.languages = patch.languages;
      if (patch.availability !== undefined) {
        body.availability = preferenceToSlots(patch.availability);
      }
      if (Object.keys(body).length > 0) await save(body);
    },
    [save],
  );

  const setLeaderboardOptIn = useCallback(
    (next: boolean) => save({ leaderboardOptIn: next }),
    [save],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      prefs,
      verification: user ? user.verification : null,
      leaderboardOptIn: user?.leaderboardOptIn ?? false,
      updatePrefs,
      setLeaderboardOptIn,
    }),
    [prefs, user, updatePrefs, setLeaderboardOptIn],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
