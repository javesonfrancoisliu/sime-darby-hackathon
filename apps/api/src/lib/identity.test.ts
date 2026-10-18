import { randomUUID } from "node:crypto";
import type { EventsResponse } from "@sdh/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { call, createUser } from "../test/api";
import { useTestTable } from "../test/table";
import { parseBearerToken } from "./identity";
import { setTokenVerifierForTests } from "./token";

useTestTable();

const BAD_TOKEN = "bad-token";
const DAY_MS = 24 * 60 * 60 * 1000;
const tokenFor = (sub: string) => `sub:${sub}`;

// Fake Cognito: "sub:<id>" verifies to that id, anything else fails.
const fakeVerifier = async (token: string) => {
  if (!token.startsWith("sub:")) throw new Error("token secret detail");
  return { sub: token.slice("sub:".length) };
};

const errorOf = (res: { body: unknown }) =>
  (res.body as { error: { code: string; message: string } }).error;

const enableCognito = () => {
  vi.stubEnv("COGNITO_USER_POOL_ID", "pool");
  vi.stubEnv("COGNITO_CLIENT_ID", "client");
};

describe("parseBearerToken", () => {
  it("returns the token for a Bearer header with any scheme case", () => {
    expect(parseBearerToken({ authorization: "Bearer abc" })).toBe("abc");
    expect(parseBearerToken({ authorization: "bearer abc" })).toBe("abc");
    expect(parseBearerToken({ authorization: "  BEARER   abc  " })).toBe("abc");
  });

  it("returns undefined when missing, empty or another scheme", () => {
    expect(parseBearerToken({})).toBeUndefined();
    expect(parseBearerToken({ authorization: "" })).toBeUndefined();
    expect(parseBearerToken({ authorization: "Basic abc" })).toBeUndefined();
    expect(parseBearerToken({ authorization: "Bearer" })).toBeUndefined();
    expect(parseBearerToken({ authorization: "Bearer   " })).toBeUndefined();
    expect(parseBearerToken({ authorization: "abc" })).toBeUndefined();
  });
});

describe("bearer sign-in", () => {
  beforeAll(() => setTokenVerifierForTests(fakeVerifier));
  afterAll(() => setTokenVerifierForTests(null));
  afterEach(() => vi.unstubAllEnvs());

  it("resolves the user whose id equals the token sub", async () => {
    enableCognito();
    const elder = await createUser("elder");
    const res = await call("GET", "/api/me", { token: tokenFor(elder.id) });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: elder.id });
  });

  it("prefers the Bearer token over a demo header", async () => {
    enableCognito();
    const elder = await createUser("elder");
    const other = await createUser("volunteer");
    const res = await call("GET", "/api/me", { token: tokenFor(elder.id), as: other.id });
    expect(res.body).toMatchObject({ id: elder.id });
  });

  it("rejects a token that fails verification without echoing it", async () => {
    enableCognito();
    const res = await call("GET", "/api/me", { token: BAD_TOKEN });
    expect(res.status).toBe(401);
    expect(errorOf(res).message).toBe("Please sign in again");
    expect(JSON.stringify(res.body)).not.toContain(BAD_TOKEN);
    expect(JSON.stringify(res.body)).not.toContain("secret detail");
  });

  it("rejects a Bearer token when Cognito is not configured", async () => {
    vi.stubEnv("COGNITO_USER_POOL_ID", undefined);
    vi.stubEnv("COGNITO_CLIENT_ID", undefined);
    const elder = await createUser("elder");
    const res = await call("GET", "/api/me", { token: tokenFor(elder.id) });
    expect(res.status).toBe(401);
    expect(errorOf(res).message).toBe("Sign-in is not available");
  });

  it("asks for profile setup when the token has no record", async () => {
    enableCognito();
    const token = tokenFor(randomUUID());
    const me = await call("GET", "/api/me", { token });
    expect(me.status).toBe(403);
    expect(errorOf(me)).toMatchObject({
      code: "PROFILE_REQUIRED",
      message: "Finish setting up your account",
    });
    const protectedRoute = await call("POST", "/api/requests", { token, body: {} });
    expect(protectedRoute.status).toBe(403);
    expect(errorOf(protectedRoute).code).toBe("PROFILE_REQUIRED");
  });

  it("keeps the demo header working without a Bearer token", async () => {
    const elder = await createUser("elder");
    expect((await call("GET", "/api/me", { as: elder.id })).status).toBe(200);
    expect((await call("GET", "/api/me", { as: randomUUID() })).status).toBe(401);
  });

  it("lists events anonymously on a bad token and flags joins for a good one", async () => {
    enableCognito();
    const coordinator = await createUser("coordinator");
    const elder = await createUser("elder");
    const created = await call("POST", "/api/events", {
      as: coordinator.id,
      body: {
        title: "Tea morning",
        category: "community_activity",
        startsAt: new Date(Date.now() + 5 * DAY_MS).toISOString(),
        durationMinutes: 60,
        location: { lat: 3.0738, lng: 101.5183, area: "Hall" },
        capacity: 10,
      },
    });
    expect(created.status).toBe(201);
    const eventId = (created.body as { id: string }).id;
    await call("POST", `/api/events/${eventId}/join`, { as: elder.id });

    const mine = (await call("GET", "/api/events", { token: tokenFor(elder.id) })).body;
    expect((mine as EventsResponse).events.find((e) => e.id === eventId)?.joined).toBe(true);

    const anon = await call("GET", "/api/events", { token: BAD_TOKEN });
    expect(anon.status).toBe(200);
    expect((anon.body as EventsResponse).events.every((e) => !("joined" in e))).toBe(true);

    const noProfile = await call("GET", "/api/events", { token: tokenFor(randomUUID()) });
    expect(noProfile.status).toBe(200);
  });
});
