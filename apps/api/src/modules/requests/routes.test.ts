import { randomUUID } from "node:crypto";
import type {
  ContributionsResponse,
  HelpRequest,
  HelpRequestSummary,
  RequestsResponse,
  User,
} from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call, createUser, createVerifiedVolunteer } from "../../test/api";
import { useTestTable } from "../../test/table";

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

  async function createOpen(overrides: Record<string, unknown> = {}) {
    const created = await create(overrides);
    const res = await call("POST", `/api/requests/${created.id}/review`, {
      as: coordinator.id,
      body: { decision: "approved" },
    });
    expect(res.status).toBe(200);
    return res.body as HelpRequest;
  }

  describe("create", () => {
    it("creates a pending request owned by the elder", async () => {
      const created = await create();
      expect(created).toMatchObject({
        status: "pending_review",
        elderId: elder.id,
        elderName: "Mak Som",
        title: "Weekly shopping",
      });
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
      const pending = await create();
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
      const unverified = await createUser("volunteer");
      expect((await call("GET", `/api/requests/${open.id}`, { as: unverified.id })).status).toBe(
        404,
      );
    });

    it("hides other requests from other elders and from volunteers before review", async () => {
      const pending = await create();
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
      const toApprove = await create();
      const approved = await call("POST", `/api/requests/${toApprove.id}/review`, {
        as: coordinator.id,
        body: { decision: "approved" },
      });
      expect(approved.body).toMatchObject({ status: "open" });

      const toReject = await create();
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
      const created = await create();
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
      const pending = await create();
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

      await call("POST", `/api/requests/${open.id}/accept`, { as: volunteer.id });
      const late = await call("POST", `/api/requests/${open.id}/cancel`, { as: elder.id });
      expect(late.status).toBe(409);
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

    it("refuses elders, coordinators and unverified volunteers", async () => {
      const open = await createOpen();
      const unverified = await createUser("volunteer");
      for (const as of [elder.id, coordinator.id, unverified.id]) {
        expect((await call("POST", `/api/requests/${open.id}/accept`, { as })).status).toBe(403);
      }
    });

    it("refuses a request that is not open with 409", async () => {
      const pending = await create();
      const res = await call("POST", `/api/requests/${pending.id}/accept`, { as: volunteer.id });
      expect(res.status).toBe(409);
      expect(
        (await call("POST", `/api/requests/${randomUUID()}/accept`, { as: volunteer.id })).status,
      ).toBe(404);
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
      const tooMuch = await call("POST", path, { as: volunteer.id, body: { minutesSpent: 121 } });
      expect(tooMuch.status).toBe(400);
      const atCap = await call("POST", path, { as: volunteer.id, body: { minutesSpent: 120 } });
      expect(atCap.status).toBe(200);
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
});
