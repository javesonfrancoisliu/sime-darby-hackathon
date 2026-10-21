import type { CommunityEvent, ContributionsResponse, HelpRequest, User } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { backdate, backdateEvent, call, createUser, createVerifiedVolunteer } from "../../test/api";
import { useTestTable } from "../../test/table";
import { VOLUNTEERING_POINTS } from "../points/service";
import { getUser } from "../users/repository";

useTestTable();

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const reject = (coordinatorId: string, volunteerId: string) =>
  call("POST", `/api/volunteers/${volunteerId}/review`, {
    as: coordinatorId,
    body: { decision: "rejected" },
  });

describe("a volunteer rejected after joining work", () => {
  let coordinator: User;
  let elder: User;

  beforeAll(async () => {
    coordinator = await createUser("coordinator");
    elder = await createUser("elder");
  });

  async function openRequest(days: number): Promise<HelpRequest> {
    const res = await call("POST", "/api/requests", {
      as: elder.id,
      body: {
        category: "groceries",
        title: "Weekly shopping",
        description: "Two bags",
        scheduledAt: inDays(days),
        durationMinutes: 60,
        location: { lat: elder.location.lat, lng: elder.location.lng, area: "Precinct 1" },
      },
    });
    return res.body as HelpRequest;
  }

  const accept = (requestId: string, userId: string) =>
    call("POST", `/api/requests/${requestId}/accept`, { as: userId });

  it("loses matched requests, which go back to the open pool", async () => {
    const volunteer = await createVerifiedVolunteer(coordinator.id);
    const other = await createVerifiedVolunteer(coordinator.id);
    const first = await openRequest(3);
    const second = await openRequest(4);
    await accept(first.id, volunteer.id);
    await accept(second.id, volunteer.id);

    expect((await reject(coordinator.id, volunteer.id)).status).toBe(200);

    const mine = await call("GET", "/api/requests/mine", { as: volunteer.id });
    expect((mine.body as { requests: HelpRequest[] }).requests).toEqual([]);
    for (const request of [first, second]) {
      const seen = await call("GET", `/api/requests/${request.id}`, { as: elder.id });
      expect(seen.body).toMatchObject({ status: "open" });
      expect(seen.body).not.toHaveProperty("volunteerId");
      expect((await accept(request.id, other.id)).status).toBe(200);
    }
  });

  it("cannot complete a request", async () => {
    const volunteer = await createVerifiedVolunteer(coordinator.id);
    const request = await openRequest(3);
    await accept(request.id, volunteer.id);
    await backdate(request.id);
    await reject(coordinator.id, volunteer.id);
    const res = await call("POST", `/api/requests/${request.id}/complete`, {
      as: volunteer.id,
      body: { minutesSpent: 60 },
    });
    expect(res.status).toBe(403);
  });

  it("is not paid when a request they completed is confirmed", async () => {
    const volunteer = await createVerifiedVolunteer(coordinator.id);
    const request = await openRequest(3);
    await accept(request.id, volunteer.id);
    await backdate(request.id);
    const done = await call("POST", `/api/requests/${request.id}/complete`, {
      as: volunteer.id,
      body: { minutesSpent: 60 },
    });
    expect(done.status).toBe(200);
    await reject(coordinator.id, volunteer.id);

    const confirmed = await call("POST", `/api/requests/${request.id}/confirm`, { as: elder.id });
    expect(confirmed.status).toBe(409);
    expect((await getUser(volunteer.id))?.points).toBe(0);
  });

  it("earns nothing from an event", async () => {
    const rejected = await createVerifiedVolunteer(coordinator.id);
    const paid = await createVerifiedVolunteer(coordinator.id);
    const created = await call("POST", "/api/events", {
      as: coordinator.id,
      body: {
        title: "Phone clinic",
        category: "digital_literacy",
        startsAt: inDays(7),
        durationMinutes: 90,
        location: { lat: 3.07, lng: 101.52, area: "Precinct 1" },
        capacity: 10,
      },
    });
    const event = created.body as CommunityEvent;
    for (const user of [rejected, paid]) {
      await call("POST", `/api/events/${event.id}/join`, { as: user.id });
    }
    await backdateEvent(event.id);
    await reject(coordinator.id, rejected.id);

    const attendance = await call("POST", `/api/events/${event.id}/attendance/complete`, {
      as: rejected.id,
    });
    expect(attendance.status).toBe(403);

    expect(
      (await call("POST", `/api/events/${event.id}/complete`, { as: coordinator.id })).status,
    ).toBe(200);
    expect((await getUser(rejected.id))?.points).toBe(0);
    expect((await getUser(paid.id))?.points).toBe(VOLUNTEERING_POINTS);
    const summary = await call("GET", "/api/contributions/mine", { as: rejected.id });
    expect((summary.body as ContributionsResponse).completedCount).toBe(0);
  });
});
