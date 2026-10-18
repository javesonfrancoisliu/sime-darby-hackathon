// Small fetch wrapper for the backend API. Sends the demo sign-in header when a
// demo user is chosen and turns error bodies ({ error: { code, message } })
// into an ApiError the UI can show.

import { storedDemoUserId } from "./storage";

const DEMO_USER_HEADER = "X-Demo-User";
export const DEFAULT_TIMEOUT_MS = 8000;
// Writes get longer: an abort after the server stored the change looks like a failure and invites a duplicate retry.
export const MUTATION_TIMEOUT_MS = 30000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  // Demo user to act as. Defaults to the stored demo sign-in.
  userId?: string | null;
  timeoutMs?: number;
};

function defaultTimeout(method: ApiOptions["method"]): number {
  return method && method !== "GET" ? MUTATION_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const userId = options.userId === undefined ? storedDemoUserId() : options.userId;
  const headers: Record<string, string> = { accept: "application/json" };
  if (userId) headers[DEMO_USER_HEADER] = userId;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultTimeout(options.method));

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
        error?.code ?? "HTTP_ERROR",
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
