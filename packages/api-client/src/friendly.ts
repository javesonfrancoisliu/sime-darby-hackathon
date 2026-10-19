import type { ApiErrorCode } from "./fetch";

export const GENERIC_ERROR_COPY = "Something went wrong. Please try again.";

// Plain words for every error code, for screens that must never show raw server text.
// The Record type makes a new contract ErrorCode a compile error until it has copy.
export const FRIENDLY_ERROR_COPY: Record<ApiErrorCode, string> = {
  NETWORK: "We cannot reach the server. Please check the internet and try again.",
  VALIDATION_FAILED: "Something in your request was not accepted. Please go back and check it.",
  UNAUTHENTICATED: "Please sign in again.",
  FORBIDDEN: "Your account cannot do that.",
  NOT_FOUND: "We could not find that. It may have been removed.",
  CONFLICT: "This has already changed. Please look at your requests again.",
  PROFILE_REQUIRED: "Please finish setting up your account first.",
  INTERNAL: GENERIC_ERROR_COPY,
  HTTP_ERROR: GENERIC_ERROR_COPY,
  BAD_RESPONSE: GENERIC_ERROR_COPY,
};
