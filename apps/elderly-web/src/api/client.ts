/*
 * The single boundary to the backend. Pages and hooks never call fetch
 * directly; they go through this module. All request/response shapes below
 * are frontend-local assumptions (TBC by backend) except ApiError, which
 * mirrors the real ErrorResponse in @sdh/contracts. (Req 9.1, 9.2, 9.4)
 */

export type HelpCategory =
  | "groceries"
  | "transport"
  | "digital_literacy"
  | "volunteer_support"
  | "health_literacy";

export type RequestStatus =
  | "pending"
  | "matched"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface HelpRequest {
  // (TBC by backend)
  id: string;
  category: HelpCategory;
  description: string;
  status: RequestStatus;
  volunteerName?: string;
}

export interface CreateHelpRequestInput {
  // (TBC by backend)
  category: HelpCategory;
  description: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export class ApiRequestError extends Error {
  code: string;
  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.code = error.code;
  }
}

const GENERIC_ERROR: ApiError = {
  code: "INTERNAL",
  message: "Something went wrong. Please try again.",
};

function isStructuredError(body: unknown): body is { error: ApiError } {
  if (typeof body !== "object" || body === null) return false;
  const err = (body as { error?: unknown }).error;
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as ApiError).code === "string" &&
    typeof (err as ApiError).message === "string"
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    // Network / non-structured failure (Req 9.4)
    throw new ApiRequestError(GENERIC_ERROR);
  }

  let body: unknown = undefined;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }

  if (!res.ok) {
    if (isStructuredError(body)) {
      throw new ApiRequestError(body.error);
    }
    throw new ApiRequestError(GENERIC_ERROR);
  }

  return body as T;
}

/*
 * DEV-only mock fallback. When the backend API is not running (local demo),
 * these calls serve an in-memory mock store so the resident's request history
 * is visible. In production (import.meta.env.DEV === false) the real API is
 * always used and no mock is loaded.
 */
const IMPORT_META_ENV = (import.meta as { env?: { DEV?: boolean; MODE?: string } }).env;
// Mock fallback is active only in local dev — never in production and never
// under tests (so the API error-handling tests see real behaviour).
const USE_MOCK_FALLBACK = Boolean(IMPORT_META_ENV?.DEV) && IMPORT_META_ENV?.MODE !== "test";

let mockStore: HelpRequest[] | null = null;

async function loadMockStore(): Promise<HelpRequest[]> {
  if (!mockStore) {
    const { MOCK_HELP_REQUESTS } = await import("../mock/helpRequestsData");
    mockStore = MOCK_HELP_REQUESTS.map((r) => ({ ...r }));
  }
  return mockStore;
}

async function withMockFallback<T>(real: () => Promise<T>, mock: () => Promise<T>): Promise<T> {
  if (!USE_MOCK_FALLBACK) return real();
  try {
    return await real();
  } catch {
    // Backend unavailable in local demo — fall back to mock data.
    return mock();
  }
}

export const api = {
  createHelpRequest(input: CreateHelpRequestInput): Promise<HelpRequest> {
    return withMockFallback(
      () =>
        request<HelpRequest>("/api/help-requests", {
          method: "POST",
          body: JSON.stringify(input),
        }),
      async () => {
        const store = await loadMockStore();
        const created: HelpRequest = {
          id: `HR-${Math.floor(1000 + Math.random() * 9000)}`,
          category: input.category,
          description: input.description,
          status: "pending",
        };
        store.unshift(created);
        return { ...created };
      },
    );
  },
  listHelpRequests(): Promise<HelpRequest[]> {
    return withMockFallback(
      () => request<HelpRequest[]>("/api/help-requests"),
      async () => (await loadMockStore()).map((r) => ({ ...r })),
    );
  },
  getHelpRequest(id: string): Promise<HelpRequest> {
    return withMockFallback(
      () => request<HelpRequest>(`/api/help-requests/${encodeURIComponent(id)}`),
      async () => {
        const found = (await loadMockStore()).find((r) => r.id === id);
        if (!found) throw new ApiRequestError({ code: "NOT_FOUND", message: "Request not found." });
        return { ...found };
      },
    );
  },
  cancelHelpRequest(id: string): Promise<HelpRequest> {
    return withMockFallback(
      () =>
        request<HelpRequest>(`/api/help-requests/${encodeURIComponent(id)}/cancel`, {
          method: "POST",
        }),
      async () => {
        const store = await loadMockStore();
        const found = store.find((r) => r.id === id);
        if (!found) throw new ApiRequestError({ code: "NOT_FOUND", message: "Request not found." });
        found.status = "cancelled";
        return { ...found };
      },
    );
  },
};
