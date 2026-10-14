import type { CreateUserBody, Role, User } from "@sdh/contracts";
import { DEMO_USER_HEADER } from "../lib/identity";
import { dispatch } from "../router";

interface CallOptions {
  as?: string;
  body?: unknown;
  query?: Record<string, string>;
}

export async function call(method: string, path: string, options: CallOptions = {}) {
  return dispatch({
    method,
    path,
    query: options.query ?? {},
    headers: options.as ? { [DEMO_USER_HEADER]: options.as } : {},
    rawBody: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

// Fictional demo people only.
export async function createUser(
  role: Role,
  overrides: Partial<CreateUserBody> = {},
): Promise<User> {
  const res = await call("POST", "/api/users", {
    body: {
      role,
      name: `Test ${role}`,
      area: "Precinct 1",
      location: { lat: 3.0738, lng: 101.5183 },
      ...overrides,
    },
  });
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
