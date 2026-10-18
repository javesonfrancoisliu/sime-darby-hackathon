import { ApiError } from "@sdh/api-client";

export interface FriendlyError {
  code: string;
  message: string;
}

const GENERIC = "Something went wrong. Please try again.";

// Plain words for each error code; the raw server text is never shown to residents.
const COPY: Record<string, string> = {
  NETWORK: "We cannot reach the server. Please check the internet and try again.",
  VALIDATION_FAILED: "Something in your request was not accepted. Please go back and check it.",
  UNAUTHENTICATED: "Please choose who is using this phone again.",
  FORBIDDEN: "This phone is not allowed to do that.",
  NOT_FOUND: "We could not find that. It may have been removed.",
  CONFLICT: "This has already changed. Please look at your requests again.",
  INTERNAL: GENERIC,
};

export function logApiError(error: unknown): void {
  console.warn("API call failed:", error);
}

export function toFriendlyError(error: unknown): FriendlyError {
  logApiError(error);
  const code = error instanceof ApiError ? error.code : "INTERNAL";
  return { code, message: COPY[code] ?? GENERIC };
}
