import { CreateMeBody, Precinct, SelfRole } from "@sdh/contracts";

// Sign-up details kept across the email-code step. Never holds the password.
export const PENDING_STORAGE_KEY = "sdh.portal.pending";

export type Pending = {
  role?: SelfRole;
  name?: string;
  precinct?: Precinct;
  email?: string;
};

export function readPending(): Pending {
  try {
    const raw = window.sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, unknown>;
    const pending: Pending = {};
    const role = SelfRole.safeParse(data.role);
    if (role.success) pending.role = role.data;
    const precinct = Precinct.safeParse(data.precinct);
    if (precinct.success) pending.precinct = precinct.data;
    if (typeof data.name === "string") pending.name = data.name;
    if (typeof data.email === "string") pending.email = data.email;
    return pending;
  } catch {
    return {};
  }
}

export function savePending(patch: Pending): void {
  try {
    const next = { ...readPending(), ...patch };
    window.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the details just will not survive a reload.
  }
}

export function clearPending(): void {
  try {
    window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was kept.
  }
}

// The exact body for POST /api/me, or null while any part is missing or not accepted.
export function toCreateMeBody(pending: Pending): CreateMeBody | null {
  const parsed = CreateMeBody.safeParse({
    role: pending.role,
    name: pending.name,
    precinct: pending.precinct,
  });
  return parsed.success ? parsed.data : null;
}
