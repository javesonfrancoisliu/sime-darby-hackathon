import { apiFetch } from "@sdh/api-client";
import type { Township } from "@sdh/contracts";

export const townshipApi = {
  get: () => apiFetch<Township>("/api/township"),
};
