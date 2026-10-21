import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { CreateUserBody, HelpRequest, Role, User, Verification } from "@sdh/contracts";
import { db, table } from "../lib/db";
import { DEMO_USER_HEADER } from "../lib/identity";
import { transitionRequest } from "../modules/requests/repository";
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

// New requests start open, so review-gate tests move one back to pending_review through the repository.
export async function setPendingReview(request: HelpRequest): Promise<HelpRequest> {
  return transitionRequest(
    request,
    { from: "open" },
    { status: "pending_review", updatedAt: new Date().toISOString() },
  );
}

// Creation forbids a past start, so tests that need a started request move it back directly.
export async function backdate(requestId: string, hours = 2): Promise<void> {
  const past = new Date(Date.now() - hours * 3_600_000).toISOString();
  await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: { PK: `REQUEST#${requestId}`, SK: "META" },
      UpdateExpression: "SET scheduledAt = :at, GSI1SK = :at, GSI3SK = :at",
      ExpressionAttributeValues: { ":at": past },
    }),
  );
}
