import { authConfigFromEnv } from "@sdh/auth";

// Demo data is shown only when this is switched on explicitly; it never replaces a failed live call.
export function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK === "true";
}

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

// Fictional township security line for the demo. Replace with the real line before launch.
export const DEMO_SECURITY_LINE = { display: "03-5550 0100", tel: "0355500100" };

// Fictional Medical ID shown to every resident until medical details can be saved.
export const DEMO_MEDICAL_ID = {
  bloodGroup: "O Positive",
  nextOfKin: "Zainal (Son)",
  nextOfKinPhone: "012-345 6789",
};
