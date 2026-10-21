import { randomUUID } from "node:crypto";
import {
  PRECINCT_LOCATIONS,
  Role,
  type CreateMeBody,
  type CreateUserBody,
  DEFAULT_SETTINGS,
  type DemoUser,
  type MedicalId,
  type PutMedicalIdBody,
  type PutSettingsBody,
  type Settings,
  type UpdateMeBody,
  type User,
  type Verification,
} from "@sdh/contracts";
import { isConditionFailure } from "../../lib/db";
import { HttpError } from "../../lib/http";
import { nowIso } from "../../lib/time";
import { releaseVolunteerSignups } from "../events/service";
import { releaseVolunteerRequests } from "../requests/service";
import {
  deleteMedicalId,
  getMedicalId,
  getSettings,
  getUser,
  listUsersByRole,
  putMedicalId,
  putSettings,
  putUser,
  setVerification,
  updateProfile,
} from "./repository";

export async function createUser(body: CreateUserBody, id: string = randomUUID()): Promise<User> {
  const now = new Date().toISOString();
  const user: User = {
    ...body,
    id,
    verification: body.role === "volunteer" ? "verified" : "not_required",
    points: 0,
    lifetimePoints: 0,
    interests: [],
    languages: [],
    leaderboardOptIn: false,
    createdAt: now,
    updatedAt: now,
  };
  await putUser(user);
  return user;
}

// Self sign-up: the id is the verified Cognito sub. A second call for the same sub is a conflict.
export async function createMyProfile(sub: string, body: CreateMeBody): Promise<User> {
  try {
    return await createUser(
      {
        role: body.role,
        name: body.name,
        area: body.precinct,
        location: PRECINCT_LOCATIONS[body.precinct],
        skills: [],
        experience: "",
        availability: [],
      },
      sub,
    );
  } catch (error) {
    if (isConditionFailure(error)) {
      throw new HttpError("CONFLICT", "Your account is already set up");
    }
    throw error;
  }
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
  let reviewed = volunteer;
  if (volunteer.verification !== decision) {
    try {
      reviewed = await setVerification(volunteer, decision, new Date().toISOString());
    } catch (error) {
      if (isConditionFailure(error)) {
        throw new HttpError("CONFLICT", "Volunteer was reviewed by someone else; reload and retry");
      }
      throw error;
    }
  }
  // Also on a repeat rejection, so a run that stopped part way can be finished.
  if (decision === "rejected") {
    await releaseVolunteerRequests(id);
    await releaseVolunteerSignups(id);
  }
  return reviewed;
}

// Medical ID is elder-only and always the caller's own; route handlers enforce the role.
export async function readMedicalId(user: User): Promise<MedicalId> {
  const medical = await getMedicalId(user.id);
  if (!medical) throw new HttpError("NOT_FOUND", "No medical ID saved");
  return medical;
}

export const saveMedicalId = (user: User, body: PutMedicalIdBody): Promise<MedicalId> =>
  putMedicalId(user.id, body, nowIso());

export const removeMedicalId = (user: User): Promise<void> => deleteMedicalId(user.id);

export async function readSettings(user: User): Promise<Settings> {
  return (await getSettings(user.id)) ?? { ...DEFAULT_SETTINGS, updatedAt: user.createdAt };
}

export const saveSettings = (user: User, body: PutSettingsBody): Promise<Settings> =>
  putSettings(user.id, body, nowIso());
