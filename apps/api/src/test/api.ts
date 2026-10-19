import type { CreateUserBody, Role, User, Verification } from "@sdh/contracts";
import { DEMO_USER_HEADER } from "../lib/identity";
import { setVerification } from "../modules/users/repository";
import { createUser as insertUser } from "../modules/users/service";
import { dispatch } from "../app";

interface CallOptions {
  as?: string;
  token?: string;
  body?: unknown;
  query?: Record<string, string>;
}

export async function call(method: string, path: string, options: CallOptions = {}) {
  return dispatch({
    method,
    path,
    query: options.query ?? {},
    headers: {
      ...(options.as ? { [DEMO_USER_HEADER]: options.as } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    rawBody: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

// Fictional demo people only.
export async function createUser(
  role: Role,
  overrides: Partial<CreateUserBody> = {},
): Promise<User> {
  const body = {
    role,
    name: `Test ${role}`,
    area: "Precinct 1",
    location: { lat: 3.0738, lng: 101.5183 },
    ...overrides,
  };
  // Coordinators cannot be created through the API, so insert them directly.
  if (role === "coordinator") return insertUser(body as CreateUserBody);
  const res = await call("POST", "/api/users", { body });
  if (res.status !== 201) throw new Error(`createUser failed: ${JSON.stringify(res.body)}`);
  return res.body as User;
}

export async function createVerifiedVolunteer(
  coordinatorId: string,
  overrides: Partial<CreateUserBody> = {},
): Promise<User> {
  const volunteer = await createUser("volunteer", overrides);
  const res = await call("POST", `/api/volunteers/${volunteer.id}/review`, {
    as: coordinatorId,
    body: { decision: "verified" },
  });
  if (res.status !== 200) throw new Error(`verify failed: ${JSON.stringify(res.body)}`);
  return res.body as User;
}

// New volunteers start verified, so gate tests set an explicit state through the repository.
export async function createVolunteerInState(
  verification: Exclude<Verification, "verified" | "not_required">,
  overrides: Partial<CreateUserBody> = {},
): Promise<User> {
  const volunteer = await createUser("volunteer", overrides);
  return setVerification(volunteer, verification, new Date().toISOString());
}
