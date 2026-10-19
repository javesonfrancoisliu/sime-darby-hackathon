import { apiFetch } from "@sdh/api-client";
import type { CreateRequestBody, HelpRequest, RequestsResponse } from "@sdh/contracts";
import { isMockMode } from "../config";
import * as mock from "../mock/mockBackend";

const requestPath = (id: string) => `/api/requests/${encodeURIComponent(id)}`;

export const requestsApi = {
  async listMine(): Promise<HelpRequest[]> {
    if (isMockMode()) return mock.listRequests();
    return (await apiFetch<RequestsResponse>("/api/requests/mine")).requests;
  },
  get(id: string): Promise<HelpRequest> {
    if (isMockMode()) return mock.getRequest(id);
    return apiFetch<HelpRequest>(requestPath(id));
  },
  create(body: CreateRequestBody): Promise<HelpRequest> {
    if (isMockMode()) return mock.createRequest(body);
    return apiFetch<HelpRequest>("/api/requests", { method: "POST", body });
  },
  cancel(id: string): Promise<HelpRequest> {
    if (isMockMode()) return mock.cancelRequest(id);
    return apiFetch<HelpRequest>(`${requestPath(id)}/cancel`, { method: "POST" });
  },
};
