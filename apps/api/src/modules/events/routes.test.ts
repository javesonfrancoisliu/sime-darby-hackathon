import { randomUUID } from "node:crypto";
import type {
  CommunityEvent,
  ContributionsResponse,
  CreateEventBody,
  EventsResponse,
  User,
} from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call, createUser, createVerifiedVolunteer } from "../../test/api";
import { useTestTable } from "../../test/table";
import { VOLUNTEERING_POINTS } from "../points/service";
import { getUser } from "../users/repository";
import { completeEvent } from "./repository";

useTestTable();

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const eventBody = (overrides: Partial<CreateEventBody> = {}) => ({
  title: "Phone clinic",
  category: "digital_literacy",
  startsAt: inDays(7),
  durationMinutes: 90,
  location: { lat: 3.07, lng: 101.52, area: "Precinct 1" },
  capacity: 10,
  ...overrides,
});

describe("events", () => {
  let coordinator: User;

  beforeAll(async () => {
    coordinator = await createUser("coordinator", { name: "Cora" });
  });

  async function createEvent(overrides: Partial<CreateEventBody> = {}): Promise<CommunityEvent> {
    const res = await call("POST", "/api/events", {
      as: coordinator.id,
      body: eventBody(overrides),
    });
    if (res.status !== 201) throw new Error(`createEvent failed: ${JSON.stringify(res.body)}`);
    return res.body as CommunityEvent;
  }

  const join = (eventId: string, userId: string) =>
    call("POST", `/api/events/${eventId}/join`, { as: userId });

  it("lets only a coordinator create an event and rejects a past start", async () => {
    const elder = await createUser("elder");
    const forbidden = await call("POST", "/api/events", { as: elder.id, body: eventBody() });
    expect(forbidden.status).toBe(403);

    const past = await call("POST", "/api/events", {
      as: coordinator.id,
      body: eventBody({ startsAt: inDays(-1) }),
    });
    expect(past.status).toBe(400);

    const created = await call("POST", "/api/events", { as: coordinator.id, body: eventBody() });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      status: "upcoming",
      signupCount: 0,
      createdBy: coordinator.id,
      description: "",
    });
  });

  it("lists upcoming events soonest first with a joined flag only for known callers", async () => {
    const elder = await createUser("elder");
    const later = await createEvent({ title: "Later", startsAt: inDays(30) });
    const sooner = await createEvent({ title: "Sooner", startsAt: inDays(20) });
    await join(sooner.id, elder.id);

    const mine = ids(await call("GET", "/api/events", { as: elder.id }));
    expect(mine.indexOf(sooner.id)).toBeLessThan(mine.indexOf(later.id));

    const signedIn = (await call("GET", "/api/events", { as: elder.id })).body as EventsResponse;
    expect(signedIn.events.find((e) => e.id === sooner.id)?.joined).toBe(true);
    expect(signedIn.events.find((e) => e.id === later.id)?.joined).toBe(false);

    for (const as of [undefined, randomUUID(), "not-a-uuid"]) {
      const res = await call("GET", "/api/events", as ? { as } : {});
      expect(res.status).toBe(200);
      const anonymous = res.body as EventsResponse;
      expect(anonymous.events.some((e) => e.id === sooner.id)).toBe(true);
      expect(anonymous.events.every((e) => !("joined" in e))).toBe(true);
    }
  });

  it("lets elders and verified volunteers join and bumps the count", async () => {
    const event = await createEvent();
    const elder = await createUser("elder");
    const volunteer = await createVerifiedVolunteer(coordinator.id);

    const first = await join(event.id, elder.id);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ signupCount: 1, joined: true });
    expect((await join(event.id, volunteer.id)).body).toMatchObject({ signupCount: 2 });
  });

  it("rejects unverified volunteers and coordinators, and unknown events", async () => {
    const event = await createEvent();
    const pending = await createUser("volunteer");
    expect((await join(event.id, pending.id)).status).toBe(403);
    expect((await join(event.id, coordinator.id)).status).toBe(403);
    const elder = await createUser("elder");
    expect((await join(randomUUID(), elder.id)).status).toBe(404);
  });

  it("returns 409 on a duplicate join", async () => {
    const event = await createEvent();
    const elder = await createUser("elder");
    await join(event.id, elder.id);
    const again = await join(event.id, elder.id);
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({ error: { message: "Already joined" } });
  });

  it("returns 409 once the event is full", async () => {
    const event = await createEvent({ capacity: 1 });
    const first = await createUser("elder");
    const second = await createUser("elder");
    expect((await join(event.id, first.id)).status).toBe(200);
    const full = await join(event.id, second.id);
    expect(full.status).toBe(409);
    expect(full.body).toMatchObject({ error: { message: "Event is full or closed" } });
  });

  it("records contributions for volunteers only and closes the event", async () => {
    const event = await createEvent({ durationMinutes: 120 });
    const elder = await createUser("elder");
    const volunteer = await createVerifiedVolunteer(coordinator.id);
    await join(event.id, elder.id);
    await join(event.id, volunteer.id);

    const forbidden = await call("POST", `/api/events/${event.id}/complete`, { as: elder.id });
    expect(forbidden.status).toBe(403);

    const done = await call("POST", `/api/events/${event.id}/complete`, { as: coordinator.id });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ status: "completed", signupCount: 2 });

    const mine = (await call("GET", "/api/contributions/mine", { as: volunteer.id }))
      .body as ContributionsResponse;
    expect(mine.totalMinutes).toBe(120);
    expect(mine.items).toHaveLength(1);
    expect(mine.items[0]).toMatchObject({
      source: "event",
      sourceId: event.id,
      title: "Phone clinic",
    });
    expect((await call("GET", "/api/contributions/mine", { as: elder.id })).status).toBe(403);

    expect(ids(await call("GET", "/api/events"))).not.toContain(event.id);
    expect((await join(event.id, (await createUser("elder")).id)).status).toBe(409);
  });

  it("completing twice returns 200 and 404 for an unknown event", async () => {
    const event = await createEvent();
    const path = `/api/events/${event.id}/complete`;
    expect((await call("POST", path, { as: coordinator.id })).status).toBe(200);
    expect((await call("POST", path, { as: coordinator.id })).status).toBe(200);
    const missing = await call("POST", `/api/events/${randomUUID()}/complete`, {
      as: coordinator.id,
    });
    expect(missing.status).toBe(404);
  });

  it("stores purpose and organiser, defaults old shapes and filters by purpose", async () => {
    const plain = await createEvent();
    expect(plain).toMatchObject({ purpose: "activity", organiser: "" });
    const drive = await createEvent({
      purpose: "volunteer_drive",
      organiser: "Elmina Residents Association",
    });
    expect(drive).toMatchObject({
      purpose: "volunteer_drive",
      organiser: "Elmina Residents Association",
    });
    const drives = ids(await call("GET", "/api/events", { query: { purpose: "volunteer_drive" } }));
    expect(drives).toContain(drive.id);
    expect(drives).not.toContain(plain.id);
    const activities = ids(await call("GET", "/api/events", { query: { purpose: "activity" } }));
    expect(activities).toContain(plain.id);
    expect(activities).not.toContain(drive.id);
    expect((await call("GET", "/api/events", { query: { purpose: "party" } })).status).toBe(400);
  });

  it("awards volunteering points once per volunteer, even when completed twice", async () => {
    const event = await createEvent();
    const elder = await createUser("elder");
    const volunteer = await createVerifiedVolunteer(coordinator.id);
    await join(event.id, elder.id);
    await join(event.id, volunteer.id);
    const path = `/api/events/${event.id}/complete`;
    expect((await call("POST", path, { as: coordinator.id })).status).toBe(200);
    expect((await call("POST", path, { as: coordinator.id })).status).toBe(200);
    expect(await pointsOf(volunteer.id)).toEqual({
      points: VOLUNTEERING_POINTS,
      lifetimePoints: VOLUNTEERING_POINTS,
    });
    expect(await pointsOf(elder.id)).toEqual({ points: 0, lifetimePoints: 0 });
    const mine = (await call("GET", "/api/contributions/mine", { as: volunteer.id }))
      .body as ContributionsResponse;
    expect(mine.items).toHaveLength(1);
  });

  it("a repeat complete finishes awards that a crashed first run left out", async () => {
    const event = await createEvent();
    const volunteer = await createVerifiedVolunteer(coordinator.id);
    await join(event.id, volunteer.id);
    // Simulate a crash after the status flip: complete without awards.
    await completeEvent(event.id, new Date().toISOString(), []);
    expect(await pointsOf(volunteer.id)).toEqual({ points: 0, lifetimePoints: 0 });
    const path = `/api/events/${event.id}/complete`;
    expect((await call("POST", path, { as: coordinator.id })).status).toBe(200);
    expect((await pointsOf(volunteer.id)).points).toBe(VOLUNTEERING_POINTS);
  });
});

async function pointsOf(userId: string) {
  const user = await getUser(userId);
  return { points: user?.points, lifetimePoints: user?.lifetimePoints };
}

function ids(res: { body: unknown }): string[] {
  return (res.body as EventsResponse).events.map((e) => e.id);
}
