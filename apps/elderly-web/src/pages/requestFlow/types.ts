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

export type FlowStep = "describe" | "when" | "length" | "confirm";

export const FLOW_STEPS: FlowStep[] = ["describe", "when", "length", "confirm"];
