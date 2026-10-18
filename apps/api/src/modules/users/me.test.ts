import { randomUUID } from "node:crypto";
import type { User } from "@sdh/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setTokenVerifierForTests } from "../../lib/token";
import { call, createUser } from "../../test/api";
import { useTestTable } from "../../test/table";

useTestTable();

const tokenFor = (sub: string) => `sub:${sub}`;

// Fake Cognito: "sub:<id>" verifies to that id, anything else fails.
const fakeVerifier = async (token: string) => {
  if (!token.startsWith("sub:")) throw new Error("bad token");
  return { sub: token.slice("sub:".length) };
};

const errorOf = (res: { body: unknown }) =>
  (res.body as { error: { code: string; message: string } }).error;

const enableCognito = () => {
  vi.stubEnv("COGNITO_USER_POOL_ID", "pool");
  vi.stubEnv("COGNITO_CLIENT_ID", "client");
};

describe("POST /api/me", () => {
  beforeAll(() => setTokenVerifierForTests(fakeVerifier));
  afterAll(() => setTokenVerifierForTests(null));
  afterEach(() => vi.unstubAllEnvs());

  const body = (overrides: Record<string, unknown> = {}) => ({
    role: "elder",
    name: "Mak Som",
    precinct: "Elmina Valley",
    ...overrides,
  });

  it("creates an elder with the sub as id and the precinct location", async () => {
    enableCognito();
    const sub = randomUUID();
    const res = await call("POST", "/api/me", { token: tokenFor(sub), body: body() });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: sub,
      role: "elder",
      name: "Mak Som",
      area: "Elmina Valley",
      location: { lat: 3.0594, lng: 101.5282 },
      verification: "not_required",
      skills: [],
      availability: [],
    } satisfies Partial<User>);
    const me = await call("GET", "/api/me", { token: tokenFor(sub) });
    expect(me.status).toBe(200);
  });

  it("creates a volunteer as pending", async () => {
    enableCognito();
    const res = await call("POST", "/api/me", {
      token: tokenFor(randomUUID()),
      body: body({ role: "volunteer", precinct: "Central Park" }),
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role: "volunteer", verification: "pending" });
  });

  it("returns 409 on a second call for the same sub", async () => {
    enableCognito();
    const token = tokenFor(randomUUID());
    expect((await call("POST", "/api/me", { token, body: body() })).status).toBe(201);
    const again = await call("POST", "/api/me", { token, body: body({ role: "volunteer" }) });
    expect(again.status).toBe(409);
    expect(errorOf(again).message).toBe("Your account is already set up");
  });

  it("rejects coordinator, extra fields and an unknown precinct", async () => {
    enableCognito();
    const token = tokenFor(randomUUID());
    for (const bad of [
      body({ role: "coordinator" }),
      body({ id: randomUUID() }),
      body({ precinct: "Nowhere" }),
    ]) {
      expect((await call("POST", "/api/me", { token, body: bad })).status).toBe(400);
    }
  });

  it("does not accept the demo header alone", async () => {
    const elder = await createUser("elder");
    const res = await call("POST", "/api/me", { as: elder.id, body: body() });
    expect(res.status).toBe(401);
  });

  it("still cannot change the role through PATCH /api/me", async () => {
    enableCognito();
    const token = tokenFor(randomUUID());
    await call("POST", "/api/me", { token, body: body() });
    const res = await call("PATCH", "/api/me", { token, body: { role: "coordinator" } });
    expect(res.status).toBe(400);
  });
});
