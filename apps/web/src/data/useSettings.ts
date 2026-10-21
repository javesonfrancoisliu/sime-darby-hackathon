import { useCallback, useState } from "react";

import type { PutSettingsBody, Settings } from "@sdh/contracts";

import { apiFetch, useSession } from "@sdh/api-client";
import { useApiResource } from "./useApiResource";

export type ProfileSettings = Pick<
  Settings,
  "notifyEvents" | "notifyVolunteering" | "shareApproxLocation"
>;

// The signed-in person's saved settings. A change is shown straight away and put back if saving fails; the failure is thrown to the caller.
export function useSettings() {
  const { userId } = useSession();
  const { data, loading, error, reload } = useApiResource<Settings>(
    userId === null ? null : "/api/me/settings",
  );
  const [pending, setPending] = useState<Partial<ProfileSettings>>({});

  const update = useCallback(
    async (patch: Partial<ProfileSettings>) => {
      if (!data) return;
      const { updatedAt: _updatedAt, ...current } = data;
      void _updatedAt;
      const body: PutSettingsBody = { ...current, ...pending, ...patch };
      setPending((prev) => ({ ...prev, ...patch }));
      try {
        await apiFetch<Settings>("/api/me/settings", { method: "PUT", body });
        await reload();
      } finally {
        setPending((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(patch)) delete next[key as keyof ProfileSettings];
          return next;
        });
      }
    },
    [data, pending, reload],
  );

  const settings = data ? { ...data, ...pending } : null;
  return { settings, loading, error, update, reload };
}
