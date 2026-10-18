import { ApiError, FRIENDLY_ERROR_COPY, GENERIC_ERROR_COPY } from "@sdh/api-client";
import { AUTH_ERROR_COPY, AuthError } from "@sdh/auth";

// Plain words for any thrown value; raw service text is never shown.
export function messageFor(err: unknown): string {
  if (err instanceof AuthError) return AUTH_ERROR_COPY[err.code];
  if (err instanceof ApiError) return FRIENDLY_ERROR_COPY[err.code];
  return GENERIC_ERROR_COPY;
}

export function isAuthCode(err: unknown, code: AuthError["code"]): boolean {
  return err instanceof AuthError && err.code === code;
}
