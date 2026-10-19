// Single demo township so every card across both modules refers to the same place.
// Per the design-system integration contract (section 11).
export const DEMO_TOWNSHIP = {
  id: "twp-elmina",
  name: "City of Elmina",
} as const;

export type Township = typeof DEMO_TOWNSHIP;
