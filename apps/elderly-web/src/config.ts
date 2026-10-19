import { authConfigFromEnv } from "@sdh/auth";

// The "who is using this phone" picker is offered unless a build sets VITE_DEMO_SIGN_IN=false,
// which pairs with an API run without DEMO_AUTH_ENABLED=true. Not a security boundary on its own.
export function demoSignInEnabled(): boolean {
  return import.meta.env.VITE_DEMO_SIGN_IN !== "false";
}

// True when Cognito settings are in the build: sign-in is real and the demo picker is off.
export function tokenModeEnabled(): boolean {
  return authConfigFromEnv(import.meta.env) !== undefined;
}

// Real Malaysian emergency number (police, ambulance, fire).
export const EMERGENCY_NUMBER = "999";
