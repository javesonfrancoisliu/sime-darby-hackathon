import type { DayChoice, TimeSlot } from "../../requests/schedule";

// What the resident has picked so far.
export interface FlowChoices {
  description: string;
  day: DayChoice | null;
  slot: TimeSlot | null;
  durationMinutes: number | null;
}

export const EMPTY_CHOICES: FlowChoices = {
  description: "",
  day: null,
  slot: null,
  durationMinutes: null,
};

export type FlowStep = "describe" | "when" | "confirm";

export const FLOW_STEPS: FlowStep[] = ["describe", "when", "confirm"];

// Choosing the category is the first screen, so it counts as step 1.
export const CATEGORY_STEPS = 1;
