import type { HelpRequest, OpportunitiesResponse, User } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call, createUser, createVerifiedVolunteer } from "../../test/api";
import { useTestTable } from "../../test/table";

useTestTable();

// Saturday 2027-01-02 10:00 and Monday 2027-01-04 15:00, Malaysia time.
const SATURDAY_MORNING = "2027-01-02T02:00:00.000Z";
const MONDAY_AFTERNOON = "2027-01-04T07:00:00.000Z";
const HOME = { lat: 3.0738, lng: 101.5183, area: "Precinct 1" };
const FAR = { lat: 3.15, lng: 101.6, area: "Far away" };

describe("GET /api/opportunities", () => {
  let coordinator: User;
  let volunteer: User;
  let groceries: HelpRequest;
  let transport: HelpRequest;
  let farAway: HelpRequest;
  let pending: HelpRequest;

  async function openRequest(body: Record<string, unknown>, approve = true): Promise<HelpRequest> {
    const elder = await createUser("elder", { location: HOME });
    const created = await call("POST", "/api/requests", {
      as: elder.id,
      body: { durationMinutes: 60, location: HOME, ...body },
    });
    const request = created.body as HelpRequest;
    if (approve) {
      await call("POST", `/api/requests/${request.id}/review`, {
        as: coordinator.id,
        body: { decision: "approved" },
      });
    }
    return request;
  }

  beforeAll(async () => {
    coordinator = await createUser("coordinator");
    volunteer = await createVerifiedVolunteer(coordinator.id, {
      location: { lat: 3.078, lng: 101.52 },
      skills: ["groceries"],
      availability: [{ day: "sat", start: "09:00", end: "12:00" }],
    });
    groceries = await openRequest({
      category: "groceries",
      title: "Groceries",
      scheduledAt: SATURDAY_MORNING,
    });
    transport = await openRequest({
      category: "transport",
      title: "Clinic trip",
      scheduledAt: MONDAY_AFTERNOON,
    });
    farAway = await openRequest({
      category: "groceries",
      title: "Far groceries",
      scheduledAt: SATURDAY_MORNING,
      location: FAR,
    });
    pending = await openRequest(
      { category: "groceries", title: "Not approved", scheduledAt: SATURDAY_MORNING },
      false,
    );
    await call("POST", "/api/events", {
      as: coordinator.id,
      body: {
        title: "Phone basics class",
        category: "digital_literacy",
        startsAt: MONDAY_AFTERNOON,
        durationMinutes: 90,
        location: { ...HOME, area: "Community hall" },
        capacity: 20,
      },
    });
  });

  const ids = (body: unknown) =>
    (body as OpportunitiesResponse).items.map((item) =>
      item.kind === "request" ? item.request.id : item.event.title,
    );

  it("lists nearby open requests and events, best match first, without exact locations", async () => {
    const res = await call("GET", "/api/opportunities", { as: volunteer.id });
    expect(res.status).toBe(200);
    const body = res.body as OpportunitiesResponse;
    const found = ids(body);
    expect(found[0]).toBe(groceries.id);
    expect(found).toContain(transport.id);
    expect(found).toContain("Phone basics class");
    expect(found).not.toContain(farAway.id);
    expect(found).not.toContain(pending.id);
    const first = body.items[0];
    expect(first?.kind === "request" && first.request).not.toHaveProperty("location");
  });

  it("filters by category, time window and schedule fit", async () => {
    const byCategory = await call("GET", "/api/opportunities", {
      as: volunteer.id,
      query: { category: "transport" },
    });
    expect(ids(byCategory.body)).toEqual([transport.id]);

    const byWindow = await call("GET", "/api/opportunities", {
      as: volunteer.id,
      query: { from: "2027-01-03T00:00:00.000Z" },
    });
    expect(ids(byWindow.body)).not.toContain(groceries.id);

    const fits = await call("GET", "/api/opportunities", {
      as: volunteer.id,
      query: { fitsMySchedule: "true" },
    });
    expect(ids(fits.body)).toEqual([groceries.id]);
  });

  it("widens with a larger radius", async () => {
    const res = await call("GET", "/api/opportunities", {
      as: volunteer.id,
      query: { radiusKm: "20" },
    });
    expect(ids(res.body)).toContain(farAway.id);
  });

  it("is only for verified volunteers", async () => {
    const unverified = await createUser("volunteer");
    const elder = await createUser("elder");
    expect((await call("GET", "/api/opportunities", { as: unverified.id })).status).toBe(403);
    expect((await call("GET", "/api/opportunities", { as: elder.id })).status).toBe(403);
    expect(
      (await call("GET", "/api/opportunities", { as: volunteer.id, query: { radiusKm: "99" } }))
        .status,
    ).toBe(400);
  });
});
