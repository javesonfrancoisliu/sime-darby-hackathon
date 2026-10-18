// Auth failures as one error type with a small code set, plus plain-words copy for each.

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "NOT_CONFIRMED"
  | "CODE_MISMATCH"
  | "CODE_EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "EMAIL_TAKEN"
  | "WEAK_PASSWORD"
  | "INVALID_INPUT"
  | "NOT_SIGNED_IN"
  | "NETWORK"
  | "UNKNOWN";

// Copy never says whether an email has an account and never carries raw service text.
export const AUTH_ERROR_COPY: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS:
    "That email and password do not match. Check them and try again, or reset your password.",
  NOT_CONFIRMED: "Your email is not confirmed yet. Please enter the code we sent to your email.",
  CODE_MISMATCH: "That code is not right. Please check it and try again.",
  CODE_EXPIRED: "That code has run out. Please ask for a new one.",
  TOO_MANY_ATTEMPTS: "Too many tries. Please wait a few minutes and try again.",
  EMAIL_TAKEN: "We could not use that email. Try signing in, or use a different email.",
  WEAK_PASSWORD: "That password is too easy to guess. Use at least 8 letters and numbers.",
  INVALID_INPUT: "Something you typed was not accepted. Please check it and try again.",
  NOT_SIGNED_IN: "Please sign in again.",
  NETWORK: "We cannot reach the server. Please check the internet and try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(AUTH_ERROR_COPY[code]);
    this.name = "AuthError";
    this.code = code;
  }
}

const PASSWORD_ATTEMPTS_TEXT = "Password attempts exceeded";

const CODE_BY_SDK_NAME: Record<string, AuthErrorCode> = {
  NotAuthorizedException: "INVALID_CREDENTIALS",
  UserNotConfirmedException: "NOT_CONFIRMED",
  CodeMismatchException: "CODE_MISMATCH",
  ExpiredCodeException: "CODE_EXPIRED",
  LimitExceededException: "TOO_MANY_ATTEMPTS",
  TooManyRequestsException: "TOO_MANY_ATTEMPTS",
  TooManyFailedAttemptsException: "TOO_MANY_ATTEMPTS",
  UsernameExistsException: "EMAIL_TAKEN",
  AliasExistsException: "EMAIL_TAKEN",
  InvalidPasswordException: "WEAK_PASSWORD",
  InvalidParameterException: "INVALID_INPUT",
};

export function toAuthError(err: unknown): AuthError {
  if (err instanceof AuthError) return err;
  if (err instanceof TypeError) return new AuthError("NETWORK");
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : "";
  if (name === "NotAuthorizedException" && message.includes(PASSWORD_ATTEMPTS_TEXT)) {
    return new AuthError("TOO_MANY_ATTEMPTS");
  }
  return new AuthError(CODE_BY_SDK_NAME[name] ?? "UNKNOWN");
}
