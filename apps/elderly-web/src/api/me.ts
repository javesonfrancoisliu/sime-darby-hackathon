import { apiFetch } from "@sdh/api-client";
import type { UpdateMeBody, User } from "@sdh/contracts";

export const meApi = {
  update: (body: UpdateMeBody) => apiFetch<User>("/api/me", { method: "PATCH", body }),
};
