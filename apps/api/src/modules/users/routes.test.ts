import { randomUUID } from "node:crypto";
import type { DemoUsersResponse, EventsResponse, User, VolunteersResponse } from "@sdh/contracts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { call, createUser, createVolunteerInState } from "../../test/api";
import { useTestTable } from "../../test/table";

useTestTable();

describe("users", () => {
  let coordinator: User;

  beforeAll(async () => {
    coordinator = await createUser("coordinator", { name: "Cora" });
  });

  it("creates volunteers as verified and other roles as not_required", async () => {
    const volunteer = await createUser("volunteer");
    const elder = await createUser("elder");
    expect(volunteer.verification).toBe("verified");
    expect(elder.verification).toBe("not_required");
    expect(coordinator.verification).toBe("not_required");
  });

  it("rejects an invalid profile with 400", async () => {
    const res = await call("POST", "/api/users", { body: { role: "elder", name: "" } });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
  });

  it("requires a known demo user", async () => {
    expect((await call("GET", "/api/me")).status).toBe(401);
    expect((await call("GET", "/api/me", { as: "not-a-uuid" })).status).toBe(401);
    expect((await call("GET", "/api/me", { as: randomUUID() })).status).toBe(401);
  });

  it("returns and partially updates the signed-in profile", async () => {
    const elder = await createUser("elder", { name: "Mak Som", experience: "" });
    const me = await call("GET", "/api/me", { as: elder.id });
    expect(me.body).toMatchObject({ id: elder.id, name: "Mak Som" });

    const updated = await call("PATCH", "/api/me", {
      as: elder.id,
      body: { name: "Mak Som Binti Ali" },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      name: "Mak Som Binti Ali",
      area: elder.area,
      role: "elder",
    });
  });

  it("does not let a user change their own role", async () => {
    const elder = await createUser("elder");
    const res = await call("PATCH", "/api/me", { as: elder.id, body: { role: "coordinator" } });
    expect(res.status).toBe(400);
  });

  it("lists demo users filtered by role without coordinator rights", async () => {
    await createUser("elder", { name: "Pak Ali" });
    const res = await call("GET", "/api/demo/users", { query: { role: "elder" } });
    const { users } = res.body as DemoUsersResponse;
    expect(users.length).toBeGreaterThan(0);
    expect(users.every((u) => u.role === "elder")).toBe(true);
    expect(users[0]).not.toHaveProperty("location");
  });

  it("lets only coordinators list and review volunteers", async () => {
    const volunteer = await createVolunteerInState("pending", { name: "Wei Ling" });
    const elder = await createUser("elder");

    expect((await call("GET", "/api/volunteers", { as: elder.id })).status).toBe(403);
    expect(
      (
        await call("POST", `/api/volunteers/${volunteer.id}/review`, {
          as: volunteer.id,
          body: { decision: "verified" },
        })
      ).status,
    ).toBe(403);

    const pending = await call("GET", "/api/volunteers", {
      as: coordinator.id,
      query: { verification: "pending" },
    });
    expect((pending.body as VolunteersResponse).volunteers.map((v) => v.id)).toContain(
      volunteer.id,
    );

    const reviewed = await call("POST", `/api/volunteers/${volunteer.id}/review`, {
      as: coordinator.id,
      body: { decision: "verified" },
    });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body).toMatchObject({ verification: "verified" });

    const verified = await call("GET", "/api/volunteers", {
      as: coordinator.id,
      query: { verification: "verified" },
    });
    const pendingAfter = await call("GET", "/api/volunteers", {
      as: coordinator.id,
      query: { verification: "pending" },
    });
    expect((verified.body as VolunteersResponse).volunteers.map((v) => v.id)).toContain(
      volunteer.id,
    );
    expect((pendingAfter.body as VolunteersResponse).volunteers.map((v) => v.id)).not.toContain(
      volunteer.id,
    );
  });

  it("never creates a coordinator through POST /api/users", async () => {
    const res = await call("POST", "/api/users", {
      body: {
        role: "coordinator",
        name: "Mallory",
        area: "Precinct 1",
        location: { lat: 3.0738, lng: 101.5183 },
      },
    });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  describe("when demo auth is disabled", () => {
    afterEach(() => vi.stubEnv("DEMO_AUTH_ENABLED", "true"));

    it("rejects every signed-in request, even for a real user", async () => {
      const elder = await createUser("elder");
      vi.stubEnv("DEMO_AUTH_ENABLED", "false");
      const res = await call("GET", "/api/me", { as: elder.id });
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        error: { code: "UNAUTHENTICATED", message: "Sign-in is not available" },
      });
      expect((await call("GET", "/api/volunteers", { as: coordinator.id })).status).toBe(401);
    });

    it("returns 404 for the demo user list and user creation", async () => {
      vi.stubEnv("DEMO_AUTH_ENABLED", "false");
      expect((await call("GET", "/api/demo/users")).status).toBe(404);
      const created = await call("POST", "/api/users", {
        body: {
          role: "elder",
          name: "Pak Ali",
          area: "Precinct 1",
          location: { lat: 3.0738, lng: 101.5183 },
        },
      });
      expect(created.status).toBe(404);
      expect(created.body).toMatchObject({ error: { code: "NOT_FOUND" } });
    });

    it("stays off for any value other than the exact string true", async () => {
      const elder = await createUser("elder");
      vi.stubEnv("DEMO_AUTH_ENABLED", "TRUE");
      expect((await call("GET", "/api/demo/users")).status).toBe(404);
      expect((await call("GET", "/api/me", { as: elder.id })).status).toBe(401);
    });

    it("stays off when the variable is unset", async () => {
      const elder = await createUser("elder");
      vi.stubEnv("DEMO_AUTH_ENABLED", undefined);
      expect((await call("GET", "/api/me", { as: elder.id })).status).toBe(401);
    });

    it("gives 404 for a coordinator body before the 403 role check", async () => {
      vi.stubEnv("DEMO_AUTH_ENABLED", "false");
      const res = await call("POST", "/api/users", {
        body: {
          role: "coordinator",
          name: "Mallory",
          area: "Precinct 1",
          location: { lat: 3.0738, lng: 101.5183 },
        },
      });
      expect(res.status).toBe(404);
    });

    it("lists events anonymously, with no joined flag, despite a bogus demo header", async () => {
      vi.stubEnv("DEMO_AUTH_ENABLED", "false");
      const res = await call("GET", "/api/events", { as: randomUUID() });
      expect(res.status).toBe(200);
      for (const event of (res.body as EventsResponse).events) {
        expect(event.joined).toBeUndefined();
      }
    });
  });

  it("returns 404 when reviewing someone who is not a volunteer, 400 for a bad id", async () => {
    const elder = await createUser("elder");
    const notVolunteer = await call("POST", `/api/volunteers/${elder.id}/review`, {
      as: coordinator.id,
      body: { decision: "verified" },
    });
    expect(notVolunteer.status).toBe(404);
    const badId = await call("POST", "/api/volunteers/abc/review", {
      as: coordinator.id,
      body: { decision: "verified" },
    });
    expect(badId.status).toBe(400);
  });
});
