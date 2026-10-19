import { authConfigFromEnv } from "@sdh/auth";

// True when Cognito settings are in the build: sign-in is real and the demo picker is off.
export function tokenModeEnabled(): boolean {
  return authConfigFromEnv(import.meta.env) !== undefined;
}
