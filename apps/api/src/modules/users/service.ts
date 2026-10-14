import { randomUUID } from "node:crypto";
import {
  Role,
  type CreateUserBody,
  type DemoUser,
  type UpdateMeBody,
  type User,
  type Verification,
} from "@sdh/contracts";
import { isConditionFailure } from "../../lib/db";
import { HttpError } from "../../lib/http";
import { getUser, listUsersByRole, putUser, setVerification, updateProfile } from "./repository";

export async function createUser(body: CreateUserBody): Promise<User> {
  const now = new Date().toISOString();
  const user: User = {
    ...body,
    id: randomUUID(),
    verification: body.role === "volunteer" ? "pending" : "not_required",
    createdAt: now,
    updatedAt: now,
  };
  await putUser(user);
  return user;
}

export async function listDemoUsers(role?: Role): Promise<DemoUser[]> {
  const roles = role ? [role] : Role.options;
  const groups = await Promise.all(roles.map((r) => listUsersByRole(r)));
  return groups
    .flat()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name, role: r, area, verification }) => ({
      id,
      name,
      role: r,
      area,
      verification,
    }));
}

export async function updateMe(user: User, changes: UpdateMeBody): Promise<User> {
  return updateProfile(user.id, changes, new Date().toISOString());
}

export async function listVolunteers(verification?: Exclude<Verification, "not_required">) {
  return listUsersByRole("volunteer", verification);
}

export async function reviewVolunteer(
  id: string,
  decision: "verified" | "rejected",
): Promise<User> {
  const volunteer = await getUser(id);
  if (!volunteer || volunteer.role !== "volunteer") {
    throw new HttpError("NOT_FOUND", "Volunteer not found");
  }
  if (volunteer.verification === decision) return volunteer;
  try {
    return await setVerification(volunteer, decision, new Date().toISOString());
  } catch (error) {
    if (isConditionFailure(error)) {
      throw new HttpError("CONFLICT", "Volunteer was reviewed by someone else; reload and retry");
    }
    throw error;
  }
}
