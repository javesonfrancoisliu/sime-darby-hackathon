import {
  DEFAULT_PAGE_SIZE,
  type CheckInResult,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type PointsSummary,
  type Streak,
  type User,
} from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { klDate, nowIso } from "../../lib/time";
import { CHECK_IN_POINTS, awardOnce, ledgerPage } from "../points/service";
import { getUser, listUsersByRole } from "../users/repository";
import { displayName } from "./displayName";
import { checkInItem, getStreak } from "./repository";

const LEADERBOARD_SIZE = 10;
const RECENT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY_STREAK: Streak = { current: 0, best: 0, recent: [] };

// KL calendar day before a YYYY-MM-DD date (no DST, so a flat 24 hours).
const dayBefore = (date: string): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);

export async function pointsSummary(
  user: User,
  cursor: string | undefined,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<PointsSummary> {
  return {
    points: user.points,
    lifetimePoints: user.lifetimePoints,
    ledger: await ledgerPage(user.id, cursor, limit),
  };
}

// A streak that missed yesterday has already ended, so it reads as zero until the next check-in.
export async function streakFor(userId: string): Promise<Streak> {
  const stored = await getStreak(userId);
  if (!stored) return EMPTY_STREAK;
  const today = klDate(nowIso());
  const alive = stored.lastCheckInDate === today || stored.lastCheckInDate === dayBefore(today);
  return alive ? stored : { ...stored, current: 0 };
}

export async function checkIn(user: User): Promise<CheckInResult> {
  const now = nowIso();
  const today = klDate(now);
  const stored = (await getStreak(user.id)) ?? EMPTY_STREAK;
  if (stored.lastCheckInDate === today) {
    throw new HttpError("ALREADY_DONE", "You already checked in today");
  }
  const current = stored.lastCheckInDate === dayBefore(today) ? stored.current + 1 : 1;
  const next: Streak = {
    current,
    best: Math.max(stored.best, current),
    lastCheckInDate: today,
    recent: [...stored.recent, today].slice(-RECENT_DAYS),
  };
  const outcome = await awardOnce(
    user.id,
    {
      awardKey: `check_in:${today}`,
      sourceType: "check_in",
      sourceId: today,
      points: CHECK_IN_POINTS,
      title: "Daily check-in",
    },
    [checkInItem(user.id, next, today, now)],
  );
  if (outcome === "conflict") throw new HttpError("CONFLICT_RETRY", "Try again");
  if (outcome !== "awarded") throw new HttpError("ALREADY_DONE", "You already checked in today");
  const fresh = await getUser(user.id);
  return { streak: next, pointsAwarded: CHECK_IN_POINTS, points: fresh?.points ?? 0 };
}

// Verified, opted-in volunteers only; ids, locations and availability never leave this function.
export async function leaderboard(caller: User): Promise<LeaderboardResponse> {
  const volunteers = (await listUsersByRole("volunteer", "verified")).filter(
    (volunteer) => volunteer.leaderboardOptIn,
  );
  volunteers.sort(
    (a, b) =>
      b.lifetimePoints - a.lifetimePoints ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
  const ranked = volunteers.map((volunteer, index): LeaderboardEntry => ({
    rank: index + 1,
    displayName: displayName(volunteer.name),
    lifetimePoints: volunteer.lifetimePoints,
    isCurrentUser: volunteer.id === caller.id,
  }));
  const me = ranked.find((entry) => entry.isCurrentUser);
  return { entries: ranked.slice(0, LEADERBOARD_SIZE), ...(me ? { me } : {}) };
}
