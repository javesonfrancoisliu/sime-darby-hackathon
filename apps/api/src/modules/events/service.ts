import { randomUUID } from "node:crypto";
import type { CommunityEvent, CreateEventBody, EventPurpose, User } from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { newContribution } from "../contributions/service";
import { VOLUNTEERING_POINTS, awardOnce } from "../points/service";
import {
  completeEvent,
  getEvent,
  joinEvent,
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

export async function listEvents(viewer?: User, purpose?: EventPurpose): Promise<CommunityEvent[]> {
  const now = new Date().toISOString();
  const all = await listUpcomingEvents(now);
  const events = purpose ? all.filter((event) => event.purpose === purpose) : all;
  if (!viewer) return events;
  const joined = await listJoinedSignups(viewer.id, now);
  return events.map((event) => ({
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

// Idempotent: a repeat call on a completed event re-runs the awards and still returns 200.
export async function complete(eventId: string): Promise<CommunityEvent> {
  const event = await requireEvent(eventId);
  const signups = await listSignups(eventId);
  const volunteers = signups.filter((signup) => signup.role === "volunteer");
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
