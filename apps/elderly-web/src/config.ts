// Demo data is shown only when this is switched on explicitly; it never replaces a failed live call.
export function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK === "true";
}
