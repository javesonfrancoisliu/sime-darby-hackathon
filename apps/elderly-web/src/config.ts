// Demo data is shown only when this is switched on explicitly; it never replaces a failed live call.
export function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK === "true";
}

// Real Malaysian emergency number (police, ambulance, fire).
export const EMERGENCY_NUMBER = "999";

// Fictional township security line for the demo. Replace with the real line before launch.
export const DEMO_SECURITY_LINE = { display: "03-5550 0100", tel: "0355500100" };
