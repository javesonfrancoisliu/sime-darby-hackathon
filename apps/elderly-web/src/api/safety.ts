import { apiFetch } from "@sdh/api-client";
import type { SafetyResponse } from "@sdh/contracts";

export const safetyApi = {
  get: () => apiFetch<SafetyResponse>("/api/safety"),
};
