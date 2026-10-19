import { ApiError, FRIENDLY_ERROR_COPY, type ApiErrorCode } from "@sdh/api-client";

export interface FriendlyError {
  code: ApiErrorCode;
  message: string;
}

export function logApiError(error: unknown): void {
  console.warn("API call failed:", error);
}

// The raw server text is never shown to residents.
export function toFriendlyError(error: unknown): FriendlyError {
  logApiError(error);
  const code: ApiErrorCode = error instanceof ApiError ? error.code : "INTERNAL";
  return { code, message: FRIENDLY_ERROR_COPY[code] };
}
