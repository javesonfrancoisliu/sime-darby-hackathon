import { randomUUID } from "node:crypto";
import type { CommunityEvent, CreateEventBody, EventPurpose, User } from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { newContribution } from "../contributions/service";
import { VOLUNTEERING_POINTS, awardOnce } from "../points/service";
import { getUser } from "../users/repository";
import {
  completeEvent,
  getEvent,
  joinEvent,
  leaveEvent,
  listJoinedSignups,
  getSignup,
  completeAttendance,
  listSignups,
  listUpcomingEvents,
  putEvent,
} from "./repository";

async function requireEvent(id: string): Promise<CommunityEvent> {
  const event = await getEvent(id);
  if (!event) throw new HttpError("NOT_FOUND", "Event not found");
  return event;
}

export async function createEvent(coordinator: User, body: CreateEventBody) {
  const now = new Date();
  if (new Date(body.startsAt).getTime() <= now.getTime()) {
    throw new HttpError("VALIDATION_FAILED", "startsAt: must be in the future");
  }
  const iso = now.toISOString();
  const event: CommunityEvent = {
    ...body,
    id: randomUUID(),
    signupCount: 0,
    status: "upcoming",
    createdBy: coordinator.id,
    createdAt: iso,
    updatedAt: iso,
  };
  await putEvent(event);
  return event;
}

export async function listEvents(
  viewer?: User,
  purpose?: EventPurpose,
  includeJoined = false,
): Promise<CommunityEvent[]> {
  const now = new Date().toISOString();
  const upcoming = await listUpcomingEvents(now);
  if (!viewer) return purpose ? upcoming.filter((event) => event.purpose === purpose) : upcoming;
  const joined = await listJoinedSignups(viewer.id, includeJoined ? "0000" : now);
  const byId = new Map(upcoming.map((event) => [event.id, event]));
  if (includeJoined) {
    const older = await Promise.all([...joined.keys()].filter((id) => !byId.has(id)).map(getEvent));
    for (const event of older) if (event) byId.set(event.id, event);
  }
  return [...byId.values()]
    .filter((event) => !purpose || event.purpose === purpose)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((event) => ({
      ...event,
      joined: joined.has(event.id),
      attendanceCompletedAt: joined.get(event.id)?.completedAt,
    }));
}

export async function join(user: User, eventId: string): Promise<CommunityEvent> {
  const event = await requireEvent(eventId);
  const outcome = await joinEvent(event, user, new Date().toISOString());
  if (outcome === "already_joined") throw new HttpError("CONFLICT", "Already joined");
  if (outcome === "full_or_closed") throw new HttpError("CONFLICT", "Event is full or closed");
  return { ...(await requireEvent(eventId)), joined: true };
}

const AWARD_ATTEMPTS = 3;

// One transaction per volunteer; a guard failure means they were already paid. A transient
// conflict is retried, so a repeat complete call can finish awards a crashed run left behind.
async function awardVolunteer(volunteerId: string, event: CommunityEvent): Promise<void> {
  for (let attempt = 0; attempt < AWARD_ATTEMPTS; attempt += 1) {
    const outcome = await awardOnce(volunteerId, {
      awardKey: `volunteering:${event.id}`,
      sourceType: "volunteering",
      sourceId: event.id,
      points: VOLUNTEERING_POINTS,
      title: event.title,
    });
    if (outcome !== "conflict") return;
  }
  throw new HttpError("CONFLICT_RETRY", "Try again in a moment");
}

function requireStarted(event: CommunityEvent): void {
  if (Date.parse(event.startsAt) > Date.now()) {
    throw new HttpError("CONFLICT", "Event has not started yet");
  }
}

// Idempotent: a repeat call on a completed event re-runs the awards and still returns 200.
export async function complete(eventId: string): Promise<CommunityEvent> {
  const event = await requireEvent(eventId);
  requireStarted(event);
  const signups = await listSignups(eventId);
  // A coordinator-rejected volunteer earns nothing from the event.
  const volunteers: typeof signups = [];
  for (const signup of signups) {
    if (signup.role !== "volunteer") continue;
    if ((await getUser(signup.userId))?.verification !== "rejected") volunteers.push(signup);
  }
  const contributions = volunteers.map((signup) =>
    newContribution({
      volunteerId: signup.userId,
      source: "event",
      sourceId: event.id,
      title: event.title,
      minutes: event.durationMinutes,
    }),
  );
  await completeEvent(event.id, new Date().toISOString(), contributions);
  for (const signup of volunteers) await awardVolunteer(signup.userId, event);
  return requireEvent(eventId);
}

// Records only this volunteer's completion; it does not close the event or award points.
export async function completeOwnAttendance(user: User, eventId: string): Promise<CommunityEvent> {
  const event = await requireEvent(eventId);
  requireStarted(event);
  const signup = await getSignup(eventId, user.id);
  if (!signup || signup.role !== "volunteer")
    throw new HttpError("FORBIDDEN", "Join this activity before confirming completion");
  if (!signup.completedAt) {
    await completeAttendance(
      signup,
      newContribution({
        volunteerId: user.id,
        source: "event",
        sourceId: event.id,
        title: event.title,
        minutes: event.durationMinutes,
      }),
    );
  }
  const saved = await getSignup(eventId, user.id);
  return { ...event, joined: true, attendanceCompletedAt: saved?.completedAt };
}

// A rejected volunteer keeps no signups for upcoming events; each frees its seat. Safe to repeat.
export async function releaseVolunteerSignups(volunteerId: string): Promise<void> {
  const now = new Date().toISOString();
  for (const eventId of (await listJoinedSignups(volunteerId, now)).keys()) {
    await leaveEvent(eventId, volunteerId, now);
  }
}
