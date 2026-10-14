import { randomUUID } from "node:crypto";
import type { CommunityEvent, CreateEventBody, User } from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { newContribution } from "../contributions/service";
import {
  completeEvent,
  getEvent,
  joinEvent,
  listJoinedEventIds,
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

export async function listEvents(viewer?: User): Promise<CommunityEvent[]> {
  const now = new Date().toISOString();
  const events = await listUpcomingEvents(now);
  if (!viewer) return events;
  const joined = await listJoinedEventIds(viewer.id, now);
  return events.map((event) => ({ ...event, joined: joined.has(event.id) }));
}

export async function join(user: User, eventId: string): Promise<CommunityEvent> {
  const event = await requireEvent(eventId);
  const outcome = await joinEvent(event, user, new Date().toISOString());
  if (outcome === "already_joined") throw new HttpError("CONFLICT", "Already joined");
  if (outcome === "full_or_closed") throw new HttpError("CONFLICT", "Event is full or closed");
  return { ...(await requireEvent(eventId)), joined: true };
}

export async function complete(eventId: string): Promise<CommunityEvent> {
  const event = await requireEvent(eventId);
  const signups = await listSignups(eventId);
  const contributions = signups
    .filter((signup) => signup.role === "volunteer")
    .map((signup) =>
      newContribution({
        volunteerId: signup.userId,
        source: "event",
        sourceId: event.id,
        title: event.title,
        minutes: event.durationMinutes,
      }),
    );
  const completed = await completeEvent(event.id, new Date().toISOString(), contributions);
  if (!completed) throw new HttpError("CONFLICT", "Event is already completed");
  return requireEvent(eventId);
}
