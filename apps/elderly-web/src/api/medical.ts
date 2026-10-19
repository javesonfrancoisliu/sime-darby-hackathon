import { apiFetch } from "@sdh/api-client";
import type { MedicalId, PutMedicalIdBody } from "@sdh/contracts";

export const medicalApi = {
  get: () => apiFetch<MedicalId>("/api/me/medical-id"),
  save: (body: PutMedicalIdBody) =>
    apiFetch<MedicalId>("/api/me/medical-id", { method: "PUT", body }),
  async remove(): Promise<true> {
    await apiFetch<void>("/api/me/medical-id", { method: "DELETE" });
    return true;
  },
};
