import { Id, type Role, type User } from "@sdh/contracts";
import { getUser } from "../modules/users/repository";
import { HttpError, type HttpRequest } from "./http";

// Simulated sign-in for the demo: the client sends the chosen profile id. Not authentication.
export const DEMO_USER_HEADER = "x-demo-user";

export async function requireUser(req: HttpRequest, ...roles: Role[]): Promise<User> {
  const raw = req.headers[DEMO_USER_HEADER];
  if (!raw) throw new HttpError("UNAUTHENTICATED", "Sign in first");
  const id = Id.safeParse(raw);
  if (!id.success) throw new HttpError("UNAUTHENTICATED", "Unknown user");
  const user = await getUser(id.data);
  if (!user) throw new HttpError("UNAUTHENTICATED", "Unknown user");
  if (roles.length > 0 && !roles.includes(user.role)) {
    throw new HttpError("FORBIDDEN", "Not allowed for your role");
  }
  return user;
}

export async function requireVerifiedVolunteer(req: HttpRequest): Promise<User> {
  const user = await requireUser(req, "volunteer");
  if (user.verification !== "verified") {
    throw new HttpError("FORBIDDEN", "Your volunteer profile is not verified yet");
  }
  return user;
}
