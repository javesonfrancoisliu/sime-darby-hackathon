import { apiFetch } from "@sdh/api-client";
import type { PutSettingsBody, Settings } from "@sdh/contracts";

export const settingsApi = {
  get: () => apiFetch<Settings>("/api/me/settings"),
  save: (body: PutSettingsBody) => apiFetch<Settings>("/api/me/settings", { method: "PUT", body }),
};
