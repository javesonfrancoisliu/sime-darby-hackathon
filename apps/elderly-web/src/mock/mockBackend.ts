import type { CreateRequestBody, HelpRequest } from "@sdh/contracts";
import { ApiError } from "@sdh/api-client";
import { MOCK_HELP_REQUESTS } from "./helpRequestsData";
import { MOCK_RESIDENT } from "./residentData";

// In-memory stand-in for the API while demo data is switched on.
let requests: HelpRequest[] = MOCK_HELP_REQUESTS.map((r) => ({ ...r }));

export function resetMockBackend(): void {
  requests = MOCK_HELP_REQUESTS.map((r) => ({ ...r }));
}

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "Request not found");
}

export async function listRequests(): Promise<HelpRequest[]> {
  return requests.map((r) => ({ ...r }));
}

export async function getRequest(id: string): Promise<HelpRequest> {
  const found = requests.find((r) => r.id === id);
  if (!found) throw notFound();
  return { ...found };
}

export async function createRequest(body: CreateRequestBody): Promise<HelpRequest> {
  const now = new Date().toISOString();
  const created: HelpRequest = {
    ...body,
    id: crypto.randomUUID(),
    elderId: MOCK_RESIDENT.id,
    elderName: MOCK_RESIDENT.name,
    status: "pending_review",
    createdAt: now,
    updatedAt: now,
  };
  requests = [created, ...requests];
  return { ...created };
}

export async function cancelRequest(id: string): Promise<HelpRequest> {
  const found = requests.find((r) => r.id === id);
  if (!found) throw notFound();
  found.status = "cancelled";
  return { ...found };
}
