import { randomUUID } from "node:crypto";
import type { Badge, BadgeWithEarned, CreateBadgeBody, User } from "@sdh/contracts";
import { nowIso } from "../../lib/time";
import { countCompleted } from "../challenges/service";
import { listBadges, putBadge } from "./repository";

export async function createBadge(body: CreateBadgeBody): Promise<Badge> {
  const badge: Badge = { ...body, id: randomUUID(), createdAt: nowIso() };
  await putBadge(badge);
  return badge;
}

// Earned is derived on every read: points badges from lifetime points, challenge badges from
// the count of completed challenges.
export async function listFor(user: User): Promise<BadgeWithEarned[]> {
  const [badges, completed] = await Promise.all([listBadges(), countCompleted(user.id)]);
  return badges
    .filter(
      (badge) =>
        user.role === "coordinator" || badge.audience === "all" || badge.audience === user.role,
    )
    .map((badge) => ({
      ...badge,
      earned:
        badge.kind === "points"
          ? user.lifetimePoints >= badge.threshold
          : completed >= badge.threshold,
    }));
}
