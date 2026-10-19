// Small fetch wrapper for the backend API. Sends the demo sign-in header when a
// demo user is chosen and turns error bodies ({ error: { code, message } })
// into an ApiError the UI can show.

import { ErrorCode } from "@sdh/contracts";

import { storedDemoUserId } from "./storage";

const DEMO_USER_HEADER = "X-Demo-User";
const AUTHORIZATION_HEADER = "Authorization";
export const DEFAULT_TIMEOUT_MS = 8000;
// Writes get longer: an abort after the server stored the change looks like a failure and invites a duplicate retry.
export const MUTATION_TIMEOUT_MS = 30000;

// Codes the server sends plus the ones this client raises itself.
export type ApiErrorCode = ErrorCode | "NETWORK" | "HTTP_ERROR" | "BAD_RESPONSE";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  // Demo user to act as. Defaults to the stored demo sign-in.
  userId?: string | null;
  timeoutMs?: number;
};

export type AccessTokenProvider = () => Promise<string | null>;

let accessTokenProvider: AccessTokenProvider | null = null;

// With a provider set, requests carry a Cognito bearer token instead of the demo header.
export function setAccessTokenProvider(provider: AccessTokenProvider | null): void {
  accessTokenProvider = provider;
}

function defaultTimeout(method: ApiOptions["method"]): number {
  return method && method !== "GET" ? MUTATION_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (accessTokenProvider) {
    // Awaited before the timeout starts so a slow token refresh cannot eat the request budget.
    let token: string | null;
    try {
      token = await accessTokenProvider();
    } catch {
      throw new ApiError(0, "NETWORK", NETWORK_MESSAGE);
    }
    if (token) headers[AUTHORIZATION_HEADER] = `Bearer ${token}`;
  } else {
    const userId = options.userId === undefined ? storedDemoUserId() : options.userId;
    if (userId) headers[DEMO_USER_HEADER] = userId;
  }
  if (options.body !== undefined) headers["content-type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? defaultTimeout(options.method),
  );

  try {
    let res: Response;
    try {
      res = await fetch(path, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(0, "NETWORK", NETWORK_MESSAGE);
    }

    // A successful reply with no body (204) has nothing to read.
    if (res.status === 204) return undefined as T;

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      // A body read aborted by the timeout is a network failure, not a bad body.
      if (controller.signal.aborted) throw new ApiError(0, "NETWORK", NETWORK_MESSAGE);
      if (res.ok) {
        throw new ApiError(res.status, "BAD_RESPONSE", "The server sent an unexpected reply.");
      }
      data = null;
    }

    if (!res.ok) {
      const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
      throw new ApiError(
        res.status,
        ErrorCode.safeParse(error?.code).data ?? "HTTP_ERROR",
        error?.message ??
          (res.status >= 500
            ? "The service isn't responding. Please try again in a moment."
            : `Request failed (${res.status})`),
      );
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

// A message safe to show a resident for any thrown value.
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
