import type { HelpRequest, MatchesResponse, User } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call, createUser, createVerifiedVolunteer, createVolunteerInState } from "../../test/api";
import { useTestTable } from "../../test/table";

useTestTable();

// Saturday 2027-01-02 10:00 Malaysia time.
const SATURDAY_MORNING = "2027-01-02T02:00:00.000Z";
const HOME = { lat: 3.0738, lng: 101.5183, area: "Precinct 1" };

describe("GET /api/requests/{id}/matches", () => {
  let coordinator: User;
  let elder: User;
  let request: HelpRequest;
  let best: User;
  let near: User;

  beforeAll(async () => {
    delete process.env.MATCHING_AI_MODEL_ID;
    coordinator = await createUser("coordinator");
    elder = await createUser("elder", { name: "Mak Som", location: HOME });
    best = await createVerifiedVolunteer(coordinator.id, {
      name: "Aina",
      location: { lat: 3.078, lng: 101.52 },
      skills: ["groceries"],
      availability: [{ day: "sat", start: "09:00", end: "12:00" }],
    });
    near = await createVerifiedVolunteer(coordinator.id, {
      name: "Wei",
      location: { lat: 3.074, lng: 101.519 },
    });
    await createVolunteerInState("pending", {
      name: "Unverified",
      location: HOME,
      skills: ["groceries"],
    });
    await createVerifiedVolunteer(coordinator.id, {
      name: "Far",
      location: { lat: 3.2, lng: 101.7 },
      skills: ["groceries"],
    });

    const created = await call("POST", "/api/requests", {
      as: elder.id,
      body: {
        category: "groceries",
        title: "Weekly groceries",
        scheduledAt: SATURDAY_MORNING,
        durationMinutes: 60,
        location: HOME,
      },
    });
    request = created.body as HelpRequest;
  });

  it("hides suggestions from the elder until approved, but not from coordinators", async () => {
    expect(
      (await call("GET", `/api/requests/${request.id}/matches`, { as: elder.id })).status,
    ).toBe(409);
    expect(
      (await call("GET", `/api/requests/${request.id}/matches`, { as: coordinator.id })).status,
    ).toBe(200);
    await call("POST", `/api/requests/${request.id}/review`, {
      as: coordinator.id,
      body: { decision: "approved" },
    });
  });

  it("ranks verified nearby volunteers with rule reasons for the owner", async () => {
    const res = await call("GET", `/api/requests/${request.id}/matches`, { as: elder.id });
    expect(res.status).toBe(200);
    const body = res.body as MatchesResponse;
    expect(body.rankedBy).toBe("rules");
    expect(body.matches.map((m) => m.volunteerId)).toEqual([best.id, near.id]);
    expect(body.matches[0]?.reason).toContain("Has helped with groceries");
    expect(body.matches[0]?.distanceKm).toBe(0.5);
  });

  it("lets coordinators see matches and hides them from others", async () => {
    expect(
      (await call("GET", `/api/requests/${request.id}/matches`, { as: coordinator.id })).status,
    ).toBe(200);
    const stranger = await createUser("elder");
    expect(
      (await call("GET", `/api/requests/${request.id}/matches`, { as: stranger.id })).status,
    ).toBe(404);
    expect((await call("GET", `/api/requests/${request.id}/matches`, { as: best.id })).status).toBe(
      403,
    );
  });

  it("returns 409 once a volunteer has taken the request", async () => {
    await call("POST", `/api/requests/${request.id}/accept`, { as: best.id });
    const res = await call("GET", `/api/requests/${request.id}/matches`, { as: elder.id });
    expect(res.status).toBe(409);
  });
});
