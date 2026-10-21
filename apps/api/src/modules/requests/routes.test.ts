import { randomUUID } from "node:crypto";
import type {
  ContributionsResponse,
  HelpRequest,
  HelpRequestSummary,
  OpportunitiesResponse,
  RequestsResponse,
  User,
} from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import {
  backdate,
  call,
  createUser,
  createVerifiedVolunteer,
  createVolunteerInState,
  setPendingReview,
} from "../../test/api";
import { useTestTable } from "../../test/table";
import { distanceKm } from "../../lib/geo";
import { VOLUNTEERING_POINTS } from "../points/service";
import { getUser } from "../users/repository";

useTestTable();

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const requestBody = (overrides: Record<string, unknown> = {}) => ({
  category: "groceries",
  title: "Weekly shopping",
  description: "Two bags",
  scheduledAt: inDays(2),
  durationMinutes: 60,
  location: { lat: 3.0738, lng: 101.5183, area: "Precinct 1" },
  ...overrides,
});

describe("help requests", () => {
  let coordinator: User;
  let elder: User;
  let volunteer: User;

  beforeAll(async () => {
    coordinator = await createUser("coordinator", { name: "Cora" });
    elder = await createUser("elder", { name: "Mak Som" });
    volunteer = await createVerifiedVolunteer(coordinator.id, {
      name: "Aina",
      location: { lat: 3.0838, lng: 101.5183 },
    });
  });

  async function create(overrides: Record<string, unknown> = {}, as = elder.id) {
    const res = await call("POST", "/api/requests", { as, body: requestBody(overrides) });
    expect(res.status).toBe(201);
    return res.body as HelpRequest;
  }

  // New requests are open straight away; review-gate tests move one back to pending_review.
  const createOpen = create;

  async function createPending(overrides: Record<string, unknown> = {}) {
    return setPendingReview(await create(overrides));
  }

  describe("create", () => {
    it("rejects a request located away from the elder's registered home", async () => {
      const elder = await createUser("elder");
      const res = await call("POST", "/api/requests", {
        as: elder.id,
        body: {
          category: "groceries",
          title: "Probe",
          description: "",
          scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
          durationMinutes: 60,
          location: { lat: elder.location.lat + 0.5, lng: elder.location.lng, area: "Elsewhere" },
        },
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain("registered home");
    });

    it("creates an open request owned by the elder", async () => {
      const created = await create();
      expect(created).toMatchObject({
        status: "open",
        elderId: elder.id,
        elderName: "Mak Som",
        title: "Weekly shopping",
      });
    });

    it("is visible to volunteers at once and can be accepted without any review", async () => {
      const created = await create({ title: "Straight to open" });
      expect(created.status).toBe("open");
      const feed = await call("GET", "/api/opportunities", { as: volunteer.id });
      expect(feed.status).toBe(200);
      const found = (feed.body as OpportunitiesResponse).items.map((item) =>
        item.kind === "request" ? item.request.id : item.event.title,
      );
      expect(found).toContain(created.id);
      const accepted = await call("POST", `/api/requests/${created.id}/accept`, {
        as: volunteer.id,
      });
      expect(accepted.status).toBe(200);
      expect(accepted.body).toMatchObject({ status: "matched", volunteerId: volunteer.id });
    });

    it("allows elders only", async () => {
      const asVolunteer = await call("POST", "/api/requests", {
        as: volunteer.id,
        body: requestBody(),
      });
      const asCoordinator = await call("POST", "/api/requests", {
        as: coordinator.id,
        body: requestBody(),
      });
      expect(asVolunteer.status).toBe(403);
      expect(asCoordinator.status).toBe(403);
      expect((await call("POST", "/api/requests", { body: requestBody() })).status).toBe(401);
    });

    it("rejects a past time and invalid input with 400", async () => {
      const past = await call("POST", "/api/requests", {
        as: elder.id,
        body: requestBody({ scheduledAt: inDays(-1) }),
      });
      expect(past.status).toBe(400);
      const short = await call("POST", "/api/requests", {
        as: elder.id,
        body: requestBody({ durationMinutes: 5 }),
      });
      expect(short.status).toBe(400);
    });
  });

  describe("lists", () => {
    it("serves /mine before {id} and returns the elder's requests newest first", async () => {
      const lister = await createUser("elder");
      const first = await create({}, lister.id);
      const second = await create({ title: "Second" }, lister.id);
      const res = await call("GET", "/api/requests/mine", { as: lister.id });
      expect(res.status).toBe(200);
      const ids = (res.body as RequestsResponse).requests.map((r) => r.id);
      expect(ids).toEqual([second.id, first.id]);
    });

    it("returns assigned requests to a volunteer soonest first and refuses coordinators", async () => {
      const worker = await createVerifiedVolunteer(coordinator.id);
      const late = await createOpen({ scheduledAt: inDays(5) });
      const soon = await createOpen({ scheduledAt: inDays(1) });
      for (const r of [late, soon]) {
        expect((await call("POST", `/api/requests/${r.id}/accept`, { as: worker.id })).status).toBe(
          200,
        );
      }
      const res = await call("GET", "/api/requests/mine", { as: worker.id });
      expect((res.body as RequestsResponse).requests.map((r) => r.id)).toEqual([soon.id, late.id]);
      expect((await call("GET", "/api/requests/mine", { as: coordinator.id })).status).toBe(403);
    });

    it("lists by status for coordinators only, defaulting to pending_review", async () => {
      const pending = await createPending();
      const open = await createOpen();
      const defaults = await call("GET", "/api/requests", { as: coordinator.id });
      const defaultIds = (defaults.body as RequestsResponse).requests.map((r) => r.id);
      expect(defaultIds).toContain(pending.id);
      expect(defaultIds).not.toContain(open.id);

      const opened = await call("GET", "/api/requests", {
        as: coordinator.id,
        query: { status: "open" },
      });
      const openRequests = (opened.body as RequestsResponse).requests;
      expect(openRequests.map((r) => r.id)).toContain(open.id);
      const times = openRequests.map((r) => r.scheduledAt);
      expect(times).toEqual([...times].sort());

      expect((await call("GET", "/api/requests", { as: elder.id })).status).toBe(403);
      expect((await call("GET", "/api/requests", { as: volunteer.id })).status).toBe(403);
      expect(
        (await call("GET", "/api/requests", { as: coordinator.id, query: { status: "bogus" } }))
          .status,
      ).toBe(400);
    });
  });

  describe("view and privacy", () => {
    it("gives the owner, assignee and coordinators the full request", async () => {
      const open = await createOpen();
      const mate = await createVerifiedVolunteer(coordinator.id);
      await call("POST", `/api/requests/${open.id}/accept`, { as: mate.id });
      for (const viewer of [elder.id, mate.id, coordinator.id]) {
        const res = await call("GET", `/api/requests/${open.id}`, { as: viewer });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: open.id, elderName: "Mak Som" });
        expect(res.body).toHaveProperty("location");
      }
    });

    it("shows an uninvolved volunteer a summary only while open, then 404", async () => {
      const open = await createOpen();
      const res = await call("GET", `/api/requests/${open.id}`, { as: volunteer.id });
      expect(res.status).toBe(200);
      const summary = res.body as HelpRequestSummary;
      expect(summary).toMatchObject({ id: open.id, area: "Precinct 1", distanceKm: 1 });
      for (const hidden of ["location", "elderId", "elderName", "volunteerId", "reviewNote"]) {
        expect(summary).not.toHaveProperty(hidden);
      }

      const taker = await createVerifiedVolunteer(coordinator.id);
      await call("POST", `/api/requests/${open.id}/accept`, { as: taker.id });
      expect((await call("GET", `/api/requests/${open.id}`, { as: volunteer.id })).status).toBe(
        404,
      );
    });

    it("hides open requests from unverified volunteers", async () => {
      const open = await createOpen();
      const unverified = await createVolunteerInState("pending");
      expect((await call("GET", `/api/requests/${open.id}`, { as: unverified.id })).status).toBe(
        404,
      );
    });

    it("hides other requests from other elders and from volunteers before review", async () => {
      const pending = await createPending();
      const stranger = await createUser("elder");
      expect((await call("GET", `/api/requests/${pending.id}`, { as: stranger.id })).status).toBe(
        404,
      );
      expect((await call("GET", `/api/requests/${pending.id}`, { as: volunteer.id })).status).toBe(
        404,
      );
      expect((await call("GET", `/api/requests/${randomUUID()}`, { as: elder.id })).status).toBe(
        404,
      );
      expect((await call("GET", "/api/requests/not-a-uuid", { as: elder.id })).status).toBe(400);
    });
  });

  describe("review", () => {
    it("approves to open and rejects with a note", async () => {
      const toApprove = await createPending();
      const approved = await call("POST", `/api/requests/${toApprove.id}/review`, {
        as: coordinator.id,
        body: { decision: "approved" },
      });
      expect(approved.body).toMatchObject({ status: "open" });

      const toReject = await createPending();
      const rejected = await call("POST", `/api/requests/${toReject.id}/review`, {
        as: coordinator.id,
        body: { decision: "rejected", note: "Not enough detail" },
      });
      expect(rejected.body).toMatchObject({ status: "rejected", reviewNote: "Not enough detail" });

      const listed = await call("GET", "/api/requests", {
        as: coordinator.id,
        query: { status: "pending_review" },
      });
      const ids = (listed.body as RequestsResponse).requests.map((r) => r.id);
      expect(ids).not.toContain(toApprove.id);
      expect(ids).not.toContain(toReject.id);
    });

    it("refuses non-coordinators and a second review", async () => {
      const created = await createPending();
      const body = { decision: "approved" };
      expect(
        (await call("POST", `/api/requests/${created.id}/review`, { as: elder.id, body })).status,
      ).toBe(403);
      expect(
        (await call("POST", `/api/requests/${created.id}/review`, { as: volunteer.id, body }))
          .status,
      ).toBe(403);
      await call("POST", `/api/requests/${created.id}/review`, { as: coordinator.id, body });
      const again = await call("POST", `/api/requests/${created.id}/review`, {
        as: coordinator.id,
        body: { decision: "rejected" },
      });
      expect(again.status).toBe(409);
      expect(again.body).toMatchObject({ error: { code: "CONFLICT" } });
      expect(
        (
          await call("POST", `/api/requests/${randomUUID()}/review`, {
            as: coordinator.id,
            body,
          })
        ).status,
      ).toBe(404);
    });
  });

  describe("cancel", () => {
    it("lets the owner cancel from pending_review and open", async () => {
      const pending = await createPending();
      const fromPending = await call("POST", `/api/requests/${pending.id}/cancel`, {
        as: elder.id,
      });
      expect(fromPending.body).toMatchObject({ status: "cancelled" });

      const open = await createOpen();
      const fromOpen = await call("POST", `/api/requests/${open.id}/cancel`, { as: elder.id });
      expect(fromOpen.body).toMatchObject({ status: "cancelled" });

      const gone = await call("GET", `/api/requests/${open.id}`, { as: volunteer.id });
      expect(gone.status).toBe(404);
    });

    it("hides the request from other elders and refuses other roles and later states", async () => {
      const open = await createOpen();
      const stranger = await createUser("elder");
      expect(
        (await call("POST", `/api/requests/${open.id}/cancel`, { as: stranger.id })).status,
      ).toBe(404);
      expect(
        (await call("POST", `/api/requests/${open.id}/cancel`, { as: volunteer.id })).status,
      ).toBe(403);
      expect(
        (await call("POST", `/api/requests/${open.id}/cancel`, { as: coordinator.id })).status,
      ).toBe(403);

      await call("POST", `/api/requests/${open.id}/cancel`, { as: elder.id });
      const late = await call("POST", `/api/requests/${open.id}/cancel`, { as: elder.id });
      expect(late.status).toBe(409);
    });

    it("lets the owner cancel a matched request and keeps it in the volunteer's list", async () => {
      const matched = await createOpen();
      await call("POST", `/api/requests/${matched.id}/accept`, { as: volunteer.id });
      const stranger = await createUser("elder");
      expect(
        (await call("POST", `/api/requests/${matched.id}/cancel`, { as: stranger.id })).status,
      ).toBe(404);
      expect(
        (await call("POST", `/api/requests/${matched.id}/cancel`, { as: volunteer.id })).status,
      ).toBe(403);

      const res = await call("POST", `/api/requests/${matched.id}/cancel`, { as: elder.id });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "cancelled", volunteerId: volunteer.id });
      const mine = await call("GET", "/api/requests/mine", { as: volunteer.id });
      const found = (mine.body as RequestsResponse).requests.find((r) => r.id === matched.id);
      expect(found?.status).toBe("cancelled");
    });

    it("refuses to cancel a completed or already cancelled request with 409", async () => {
      const done = await createOpen();
      await call("POST", `/api/requests/${done.id}/accept`, { as: volunteer.id });
      await backdate(done.id);
      await call("POST", `/api/requests/${done.id}/complete`, {
        as: volunteer.id,
        body: { minutesSpent: 30 },
      });
      const completed = await call("POST", `/api/requests/${done.id}/cancel`, { as: elder.id });
      expect(completed.status).toBe(409);
      await call("POST", `/api/requests/${done.id}/confirm`, { as: elder.id });
      const confirmed = await call("POST", `/api/requests/${done.id}/cancel`, { as: elder.id });
      expect(confirmed.status).toBe(409);
    });

    it("lets a cancel and a complete race end with exactly one winner", async () => {
      const raced = await createOpen();
      await call("POST", `/api/requests/${raced.id}/accept`, { as: volunteer.id });
      await backdate(raced.id);
      const [cancel, complete] = await Promise.all([
        call("POST", `/api/requests/${raced.id}/cancel`, { as: elder.id }),
        call("POST", `/api/requests/${raced.id}/complete`, {
          as: volunteer.id,
          body: { minutesSpent: 30 },
        }),
      ]);
      expect([cancel.status, complete.status].sort()).toEqual([200, 409]);
    });
  });

  describe("withdraw", () => {
    const withdraw = (id: string, as: string) =>
      call("POST", `/api/requests/${id}/withdraw`, { as });

    it("reopens the request and clears the volunteer", async () => {
      const open = await createOpen();
      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      const res = await withdraw(open.id, volunteer.id);
      expect(res.status).toBe(200);
      const summary = res.body as HelpRequestSummary;
      expect(summary).toMatchObject({ id: open.id, status: "open", area: "Precinct 1" });
      expect(summary).not.toHaveProperty("elderId");
      expect(summary).not.toHaveProperty("location");

      const stored = (await call("GET", `/api/requests/${open.id}`, { as: elder.id }))
        .body as HelpRequest;
      expect(stored.status).toBe("open");
      expect(stored.volunteerId).toBeUndefined();
      expect(stored.volunteerName).toBeUndefined();
      expect(stored.acceptedAt).toBeUndefined();

      const mine = await call("GET", "/api/requests/mine", { as: volunteer.id });
      expect((mine.body as RequestsResponse).requests.map((r) => r.id)).not.toContain(open.id);

      const other = await createVerifiedVolunteer(coordinator.id);
      const retaken = await call("POST", `/api/requests/${open.id}/accept`, { as: other.id });
      expect(retaken.status).toBe(200);
      expect(retaken.body).toMatchObject({ status: "matched", volunteerId: other.id });
    });

    it("hides the request from other volunteers and refuses other roles", async () => {
      const open = await createOpen();
      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      const other = await createVerifiedVolunteer(coordinator.id);
      expect((await withdraw(open.id, other.id)).status).toBe(404);
      expect((await withdraw(open.id, elder.id)).status).toBe(403);
      expect((await withdraw(open.id, coordinator.id)).status).toBe(403);
      expect((await withdraw(randomUUID(), volunteer.id)).status).toBe(404);
    });

    it("refuses a second withdraw and a completed request with 409", async () => {
      const open = await createOpen();
      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      await withdraw(open.id, volunteer.id);
      expect((await withdraw(open.id, volunteer.id)).status).toBe(404);

      const done = await createOpen();
      await call("POST", `/api/requests/${done.id}/accept`, { as: volunteer.id });
      await backdate(done.id);
      await call("POST", `/api/requests/${done.id}/complete`, {
        as: volunteer.id,
        body: { minutesSpent: 30 },
      });
      const late = await withdraw(done.id, volunteer.id);
      expect(late.status).toBe(409);
      expect(late.body).toMatchObject({ error: { code: "CONFLICT" } });
    });

    it("lets a withdraw and an elder cancel race end with exactly one winner", async () => {
      const raced = await createOpen();
      await call("POST", `/api/requests/${raced.id}/accept`, { as: volunteer.id });
      const [out, cancel] = await Promise.all([
        withdraw(raced.id, volunteer.id),
        call("POST", `/api/requests/${raced.id}/cancel`, { as: elder.id }),
      ]);
      expect([out.status, cancel.status].sort()).toEqual([200, 409]);
    });
  });

  describe("accept", () => {
    it("matches an open request to the volunteer", async () => {
      const open = await createOpen();
      const res = await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: "matched",
        volunteerId: volunteer.id,
        volunteerName: "Aina",
      });
      const matched = await call("GET", "/api/requests", {
        as: coordinator.id,
        query: { status: "matched" },
      });
      expect((matched.body as RequestsResponse).requests.map((r) => r.id)).toContain(open.id);
    });

    it("tells a volunteer the request was cancelled rather than taken", async () => {
      const open = await createOpen();
      await call("POST", `/api/requests/${open.id}/cancel`, { as: elder.id });
      const res = await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        error: { code: "CONFLICT", message: "Request was cancelled" },
      });

      const taken = await createOpen();
      const first = await createVerifiedVolunteer(coordinator.id);
      await call("POST", `/api/requests/${taken.id}/accept`, { as: first.id });
      const late = await call("POST", `/api/requests/${taken.id}/accept`, { as: volunteer.id });
      expect(late.body).toMatchObject({ error: { message: "Request was already taken" } });
    });

    it("returns the exact place and no elder id when the elder shares nothing extra", async () => {
      const open = await createOpen();
      const res = await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      const body = res.body as Record<string, unknown>;
      expect(body.location).toEqual({ lat: 3.0738, lng: 101.5183, area: "Precinct 1" });
      expect(body).not.toHaveProperty("elderId");
      expect(body).toMatchObject({ elderName: "Mak Som" });
    });

    it("snaps the place to a 0.5 km grid when the elder turned on shareApproxLocation", async () => {
      const sharer = await createUser("elder", { name: "Pak Ali" });
      const settings = {
        notifyEvents: true,
        notifyVolunteering: true,
        shareApproxLocation: true,
        fontSize: "normal",
        highContrast: false,
        reducedMotion: false,
        voiceAssist: false,
      };
      const saved = await call("PUT", "/api/me/settings", { as: sharer.id, body: settings });
      expect(saved.status).toBe(200);
      const open = await create({}, sharer.id);
      const accepted = await call("POST", `/api/requests/${open.id}/accept`, {
        as: volunteer.id,
      });
      const place = (accepted.body as HelpRequest).location;
      expect(place.area).toBe("Precinct 1");
      expect(place).not.toEqual(open.location);
      expect(distanceKm(place, open.location)).toBeLessThan(0.5);
      expect(accepted.body).not.toHaveProperty("elderId");

      const viewed = await call("GET", `/api/requests/${open.id}`, { as: volunteer.id });
      expect((viewed.body as HelpRequest).location).toEqual(place);
      const mine = await call("GET", "/api/requests/mine", { as: volunteer.id });
      const listed = (mine.body as RequestsResponse).requests.find((r) => r.id === open.id);
      expect(listed?.location).toEqual(place);
      expect(listed).not.toHaveProperty("elderId");

      const asOwner = await call("GET", `/api/requests/${open.id}`, { as: sharer.id });
      expect((asOwner.body as HelpRequest).location).toEqual(open.location);
      expect(asOwner.body).toHaveProperty("elderId", sharer.id);
    });

    it("refuses elders, coordinators and unverified volunteers", async () => {
      const open = await createOpen();
      const unverified = await createVolunteerInState("pending");
      for (const as of [elder.id, coordinator.id, unverified.id]) {
        expect((await call("POST", `/api/requests/${open.id}/accept`, { as })).status).toBe(403);
      }
    });

    it("lets a brand new volunteer accept straight away", async () => {
      const open = await createOpen();
      const fresh = await createUser("volunteer");
      expect(fresh.verification).toBe("verified");
      expect((await call("POST", `/api/requests/${open.id}/accept`, { as: fresh.id })).status).toBe(
        200,
      );
    });

    it("refuses a request that is not open with 409", async () => {
      const pending = await createPending();
      const res = await call("POST", `/api/requests/${pending.id}/accept`, { as: volunteer.id });
      expect(res.status).toBe(409);
      expect(
        (await call("POST", `/api/requests/${randomUUID()}/accept`, { as: volunteer.id })).status,
      ).toBe(404);
    });

    it("refuses a second request at the same time with 409 until the first is released", async () => {
      const worker = await createVerifiedVolunteer(coordinator.id, { name: "Slot" });
      const at = inDays(5);
      const first = await createOpen({ scheduledAt: at });
      const same = await createOpen({ scheduledAt: at });
      const later = await createOpen({ scheduledAt: inDays(6) });
      expect(
        (await call("POST", `/api/requests/${first.id}/accept`, { as: worker.id })).status,
      ).toBe(200);
      const clash = await call("POST", `/api/requests/${same.id}/accept`, { as: worker.id });
      expect(clash.status).toBe(409);
      expect(clash.body).toMatchObject({ error: { code: "CONFLICT" } });
      expect(JSON.stringify(clash.body)).toContain("already have a request at this time");
      const stillOpen = await call("GET", `/api/requests/${same.id}`, { as: elder.id });
      expect(stillOpen.body).toMatchObject({ status: "open" });
      expect(
        (await call("POST", `/api/requests/${later.id}/accept`, { as: worker.id })).status,
      ).toBe(200);

      await call("POST", `/api/requests/${first.id}/withdraw`, { as: worker.id });
      expect(
        (await call("POST", `/api/requests/${same.id}/accept`, { as: worker.id })).status,
      ).toBe(200);
    });

    it("lets only one of two simultaneous accepts for the same slot win", async () => {
      const worker = await createVerifiedVolunteer(coordinator.id, { name: "Race" });
      const at = new Date(Date.now() + 8 * DAY_MS);
      const utc = await createOpen({ scheduledAt: at.toISOString() });
      // The same instant written with an offset must hit the same slot.
      const shifted = await createOpen({
        scheduledAt: new Date(at.getTime() + 8 * 3_600_000).toISOString().replace("Z", "+08:00"),
      });
      const results = await Promise.all([
        call("POST", `/api/requests/${utc.id}/accept`, { as: worker.id }),
        call("POST", `/api/requests/${shifted.id}/accept`, { as: worker.id }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const mine = await call("GET", "/api/requests/mine", { as: worker.id });
      const matched = (mine.body as { requests: HelpRequest[] }).requests.filter(
        (r) => r.status === "matched",
      );
      expect(matched).toHaveLength(1);
    });

    it("frees the slot when the elder cancels a matched request", async () => {
      const worker = await createVerifiedVolunteer(coordinator.id, { name: "Cancelled" });
      const at = inDays(9);
      const first = await createOpen({ scheduledAt: at });
      const same = await createOpen({ scheduledAt: at });
      await call("POST", `/api/requests/${first.id}/accept`, { as: worker.id });
      expect(
        (await call("POST", `/api/requests/${first.id}/cancel`, { as: elder.id })).status,
      ).toBe(200);
      expect(
        (await call("POST", `/api/requests/${same.id}/accept`, { as: worker.id })).status,
      ).toBe(200);
    });

    it("lets a different volunteer take the same time slot", async () => {
      const at = inDays(7);
      const a = await createOpen({ scheduledAt: at });
      const b = await createOpen({ scheduledAt: at });
      const other = await createVerifiedVolunteer(coordinator.id);
      expect(
        (await call("POST", `/api/requests/${a.id}/accept`, { as: volunteer.id })).status,
      ).toBe(200);
      expect((await call("POST", `/api/requests/${b.id}/accept`, { as: other.id })).status).toBe(
        200,
      );
    });

    it("lets exactly one of two concurrent volunteers win", async () => {
      const open = await createOpen();
      const other = await createVerifiedVolunteer(coordinator.id, { name: "Wei Ling" });
      const results = await Promise.all([
        call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id }),
        call("POST", `/api/requests/${open.id}/accept`, { as: other.id }),
      ]);
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([200, 409]);
      const loser = results.find((r) => r.status === 409);
      expect(loser?.body).toMatchObject({ error: { code: "CONFLICT" } });
    });
  });

  describe("complete", () => {
    it("completes, records minutes and shows the contribution", async () => {
      const worker = await createVerifiedVolunteer(coordinator.id, { name: "Hana" });
      const open = await createOpen({ title: "Fix the phone" });
      await call("POST", `/api/requests/${open.id}/accept`, { as: worker.id });
      await backdate(open.id);
      const res = await call("POST", `/api/requests/${open.id}/complete`, {
        as: worker.id,
        body: { minutesSpent: 45 },
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "completed", minutesSpent: 45 });

      const contributions = await call("GET", "/api/contributions/mine", { as: worker.id });
      const summary = contributions.body as ContributionsResponse;
      expect(summary).toMatchObject({ totalMinutes: 45, completedCount: 1 });
      expect(summary.items[0]).toMatchObject({
        source: "request",
        sourceId: open.id,
        title: "Fix the phone",
        minutes: 45,
      });

      const again = await call("POST", `/api/requests/${open.id}/complete`, {
        as: worker.id,
        body: { minutesSpent: 45 },
      });
      expect(again.status).toBe(409);
      const after = await call("GET", "/api/contributions/mine", { as: worker.id });
      expect((after.body as ContributionsResponse).completedCount).toBe(1);
    });

    it("refuses other roles, other volunteers and unmatched requests", async () => {
      const open = await createOpen();
      const body = { minutesSpent: 30 };
      const path = `/api/requests/${open.id}/complete`;
      expect((await call("POST", path, { as: volunteer.id, body })).status).toBe(404);

      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      const other = await createVerifiedVolunteer(coordinator.id);
      expect((await call("POST", path, { as: other.id, body })).status).toBe(404);
      expect((await call("POST", path, { as: elder.id, body })).status).toBe(403);
      expect((await call("POST", path, { as: coordinator.id, body })).status).toBe(403);
      expect(
        (await call("POST", path, { as: volunteer.id, body: { minutesSpent: 0 } })).status,
      ).toBe(400);
    });

    it("caps claimed minutes at twice the planned duration", async () => {
      const open = await createOpen();
      const path = `/api/requests/${open.id}/complete`;
      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      await backdate(open.id);
      const tooMuch = await call("POST", path, { as: volunteer.id, body: { minutesSpent: 121 } });
      expect(tooMuch.status).toBe(400);
      const atCap = await call("POST", path, { as: volunteer.id, body: { minutesSpent: 120 } });
      expect(atCap.status).toBe(200);
    });

    it("refuses to complete before the scheduled start with 409 and allows it after", async () => {
      const open = await createOpen();
      const path = `/api/requests/${open.id}/complete`;
      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      const early = await call("POST", path, { as: volunteer.id, body: { minutesSpent: 30 } });
      expect(early.status).toBe(409);
      expect(early.body).toMatchObject({ error: { code: "CONFLICT" } });
      expect(JSON.stringify(early.body)).toContain("not started");
      const stored = await call("GET", `/api/requests/${open.id}`, { as: elder.id });
      expect(stored.body).toMatchObject({ status: "matched" });
      const contributions = await call("GET", "/api/contributions/mine", { as: volunteer.id });
      expect(
        (contributions.body as ContributionsResponse).items.map((i) => i.sourceId),
      ).not.toContain(open.id);

      await backdate(open.id, 0.01);
      expect(
        (await call("POST", path, { as: volunteer.id, body: { minutesSpent: 30 } })).status,
      ).toBe(200);
    });

    it("cannot complete a request that was never accepted", async () => {
      const open = await createOpen();
      const res = await call("POST", `/api/requests/${open.id}/complete`, {
        as: volunteer.id,
        body: { minutesSpent: 30 },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("confirm", () => {
    async function completed(ownerId = elder.id) {
      const open = await createOpen();
      expect(open.elderId).toBe(ownerId);
      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      await backdate(open.id);
      const done = await call("POST", `/api/requests/${open.id}/complete`, {
        as: volunteer.id,
        body: { minutesSpent: 30 },
      });
      expect(done.status).toBe(200);
      return open;
    }
    const confirm = (id: string, as: string) => call("POST", `/api/requests/${id}/confirm`, { as });
    const balance = async () => {
      const user = await getUser(volunteer.id);
      return { points: user?.points, lifetimePoints: user?.lifetimePoints };
    };

    it("confirms once, pays the volunteer once and rejects a double confirm", async () => {
      const before = (await balance()).points ?? 0;
      const request = await completed();
      const res = await confirm(request.id, elder.id);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: request.id, status: "completed" });
      expect((res.body as HelpRequest).confirmedAt).toBeDefined();
      expect((await balance()).points).toBe(before + VOLUNTEERING_POINTS);

      const again = await confirm(request.id, elder.id);
      expect(again.status).toBe(409);
      expect(again.body).toMatchObject({ error: { code: "ALREADY_DONE" } });
      expect((await balance()).points).toBe(before + VOLUNTEERING_POINTS);
    });

    it("parallel confirms pay the volunteer exactly once", async () => {
      const before = (await balance()).points ?? 0;
      const request = await completed();
      const results = await Promise.all([
        confirm(request.id, elder.id),
        confirm(request.id, elder.id),
        confirm(request.id, elder.id),
      ]);
      expect(results.some((r) => r.status === 200)).toBe(true);
      expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(true);
      expect((await balance()).points).toBe(before + VOLUNTEERING_POINTS);
    });

    it("hides the request from another elder and forbids volunteers", async () => {
      const request = await completed();
      const other = await createUser("elder");
      expect((await confirm(request.id, other.id)).status).toBe(404);
      expect((await confirm(request.id, volunteer.id)).status).toBe(403);
      const stored = await call("GET", `/api/requests/${request.id}`, { as: elder.id });
      expect((stored.body as HelpRequest).confirmedAt).toBeUndefined();
    });

    it("refuses a request that is not completed", async () => {
      const open = await createOpen();
      const res = await confirm(open.id, elder.id);
      expect(res.status).toBe(409);
      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      expect((await confirm(open.id, elder.id)).status).toBe(409);
      expect((await confirm(randomUUID(), elder.id)).status).toBe(404);
    });

    it("lets a coordinator confirm as a fallback, once", async () => {
      const before = (await balance()).points ?? 0;
      const request = await completed();
      const res = await confirm(request.id, coordinator.id);
      expect(res.status).toBe(200);
      expect((res.body as HelpRequest).confirmedAt).toBeDefined();
      expect((await confirm(request.id, coordinator.id)).status).toBe(409);
      expect((await confirm(request.id, elder.id)).status).toBe(409);
      expect((await balance()).points).toBe(before + VOLUNTEERING_POINTS);
    });
  });
});
