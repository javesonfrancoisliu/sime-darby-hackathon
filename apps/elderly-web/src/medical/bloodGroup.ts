import { BloodGroup } from "@sdh/contracts";

export const BLOOD_GROUPS = BloodGroup.options;

// "unknown" reads as plain words for a resident.
export function bloodGroupText(group: BloodGroup): string {
  return group === "unknown" ? "Not sure" : group;
}
