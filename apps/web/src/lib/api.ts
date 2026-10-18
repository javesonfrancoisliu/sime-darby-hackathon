// Small fetch wrapper for the backend API. Sends the demo sign-in header when a
// demo user is chosen (see data/SessionContext.tsx) and turns error bodies
// ({ error: { code, message } }) into an ApiError the UI can show.

export const DEMO_USER_STORAGE_KEY = "tc.demoUserId";
const DEMO_USER_HEADER = "X-Demo-User";

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

export function storedDemoUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** Demo user to act as. Defaults to the stored demo sign-in. */
  userId?: string | null;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const userId = options.userId === undefined ? storedDemoUserId() : options.userId;
  const headers: Record<string, string> = { accept: "application/json" };
  if (userId) headers[DEMO_USER_HEADER] = userId;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK",
      "Can't reach the server. Check your connection and try again.",
    );
  }

  const data: unknown = await res.json().catch(() => null);
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
}

/** A message safe to show a resident for any thrown value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
