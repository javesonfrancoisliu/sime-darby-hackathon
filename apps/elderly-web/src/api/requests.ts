import { apiFetch } from "@sdh/api-client";
import type { CreateRequestBody, HelpRequest, RequestsResponse } from "@sdh/contracts";

const requestPath = (id: string) => `/api/requests/${encodeURIComponent(id)}`;

export const requestsApi = {
  async listMine(): Promise<HelpRequest[]> {
    return (await apiFetch<RequestsResponse>("/api/requests/mine")).requests;
  },
  get(id: string): Promise<HelpRequest> {
    return apiFetch<HelpRequest>(requestPath(id));
  },
  create(body: CreateRequestBody): Promise<HelpRequest> {
    return apiFetch<HelpRequest>("/api/requests", { method: "POST", body });
  },
  cancel(id: string): Promise<HelpRequest> {
    return apiFetch<HelpRequest>(`${requestPath(id)}/cancel`, { method: "POST" });
  },
  confirm(id: string): Promise<HelpRequest> {
    return apiFetch<HelpRequest>(`${requestPath(id)}/confirm`, { method: "POST" });
  },
};
