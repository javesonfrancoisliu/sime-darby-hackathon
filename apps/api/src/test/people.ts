import type { CreateUserBody, User } from "@sdh/contracts";
import { createUser as createUserRecord, reviewVolunteer } from "../modules/users/service";

const BASE_PROFILE: Omit<CreateUserBody, "role"> = {
  name: "Test Person",
  area: "Elmina West",
  location: { lat: 3.0738, lng: 101.5183 },
  skills: [],
  experience: "",
  availability: [],
};

// Direct service calls (no HTTP): fast setup for module tests. Fictional people only.
export const createElder = (overrides: Partial<CreateUserBody> = {}): Promise<User> =>
  createUserRecord({ ...BASE_PROFILE, name: "Test Elder", ...overrides, role: "elder" });

export const createCoordinator = (overrides: Partial<CreateUserBody> = {}): Promise<User> =>
  createUserRecord({
    ...BASE_PROFILE,
    name: "Test Coordinator",
    ...overrides,
    role: "coordinator",
  });

export async function createVerifiedVolunteerDirect(
  overrides: Partial<CreateUserBody> = {},
): Promise<User> {
  const volunteer = await createUserRecord({
    ...BASE_PROFILE,
    name: "Test Volunteer",
    ...overrides,
    role: "volunteer",
  });
  return reviewVolunteer(volunteer.id, "verified");
}
