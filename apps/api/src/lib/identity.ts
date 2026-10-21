import { Id, type Role, type User } from "@sdh/contracts";
import { getUser } from "../modules/users/repository";
import { config } from "./config";
import { HttpError, type HttpRequest } from "./http";
import { verifyAccessToken } from "./token";

// Simulated sign-in for the demo: the client sends the chosen profile id. Not authentication.
export const DEMO_USER_HEADER = "x-demo-user";

const AUTHORIZATION_HEADER = "authorization";
const BEARER_SCHEME = "bearer";

// Demo-only routes do not exist unless demo sign-in is enabled.
export function requireDemoAuthEnabled(): void {
  if (!config.demoAuthEnabled) throw new HttpError("NOT_FOUND", "Not found");
}

// Reads `Authorization: Bearer <token>`; the scheme is case-insensitive. Headers arrive lower-cased.
export function parseBearerToken(headers: HttpRequest["headers"]): string | undefined {
  const raw = headers[AUTHORIZATION_HEADER]?.trim();
  if (!raw) return undefined;
  const space = raw.indexOf(" ");
  if (space < 0 || raw.slice(0, space).toLowerCase() !== BEARER_SCHEME) return undefined;
  return raw.slice(space + 1).trim() || undefined;
}

async function verifiedSub(token: string): Promise<string> {
  if (!config.bearerAuthEnabled) throw new HttpError("UNAUTHENTICATED", "Sign-in is not available");
  return (await verifyAccessToken(token)).sub;
}

// Bearer only: the demo header is never accepted, so a profile can only be created for a real sign-in.
export async function requireToken(req: HttpRequest): Promise<{ sub: string }> {
  const token = parseBearerToken(req.headers);
  if (!token) throw new HttpError("UNAUTHENTICATED", "Sign in first");
  return { sub: await verifiedSub(token) };
}

async function resolveUser(req: HttpRequest): Promise<User> {
  const token = parseBearerToken(req.headers);
  if (token) {
    const user = await getUser(await verifiedSub(token));
    if (!user) throw new HttpError("PROFILE_REQUIRED", "Finish setting up your account");
    return user;
  }
  if (!config.demoAuthEnabled) throw new HttpError("UNAUTHENTICATED", "Sign-in is not available");
  const raw = req.headers[DEMO_USER_HEADER];
  if (!raw) throw new HttpError("UNAUTHENTICATED", "Sign in first");
  const id = Id.safeParse(raw);
  if (!id.success) throw new HttpError("UNAUTHENTICATED", "Unknown user");
  const user = await getUser(id.data);
  if (!user) throw new HttpError("UNAUTHENTICATED", "Unknown user");
  return user;
}

export async function requireUser(req: HttpRequest, ...roles: Role[]): Promise<User> {
  const user = await resolveUser(req);
  if (roles.length > 0 && !roles.includes(user.role)) {
    throw new HttpError("FORBIDDEN", "Not allowed for your role");
  }
  return user;
}

// For public routes: no identity, a bad identity or a missing profile all mean anonymous.
export async function optionalUser(req: HttpRequest): Promise<User | undefined> {
  if (!parseBearerToken(req.headers) && !req.headers[DEMO_USER_HEADER]) return undefined;
  try {
    return await resolveUser(req);
  } catch (error) {
    if (
      error instanceof HttpError &&
      (error.code === "UNAUTHENTICATED" || error.code === "PROFILE_REQUIRED")
    ) {
      return undefined;
    }
    throw error;
  }
}

const NOT_VERIFIED_MESSAGE = "Your volunteer profile is not verified yet";

export async function requireVerifiedVolunteer(req: HttpRequest): Promise<User> {
  const user = await requireUser(req, "volunteer");
  if (user.verification !== "verified") throw new HttpError("FORBIDDEN", NOT_VERIFIED_MESSAGE);
  return user;
}

// For points and reward actions: elders and non-rejected volunteers pass; a coordinator-rejected
// volunteer is blocked.
export async function requireNotRejected(req: HttpRequest, ...roles: Role[]): Promise<User> {
  const user = await requireUser(req, ...roles);
  if (user.role === "volunteer" && user.verification === "rejected") {
    throw new HttpError("FORBIDDEN", NOT_VERIFIED_MESSAGE);
  }
  return user;
}
