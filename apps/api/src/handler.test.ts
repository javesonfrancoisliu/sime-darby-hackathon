import { HealthResponse } from "@sdh/contracts";
import { describe, expect, it } from "vitest";
import { handler } from "./handler";
import { apiEvent } from "./test/event";

describe("handler", () => {
  it("serves GET /api/health matching the contract", async () => {
    const res = await handler(apiEvent({ path: "/api/health" }));
    expect(res.statusCode).toBe(200);
    expect(res.headers?.["content-type"]).toContain("application/json");
    expect(res.headers?.["cache-control"]).toBe("no-store");
    expect(HealthResponse.safeParse(JSON.parse(res.body ?? "")).success).toBe(true);
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await handler(apiEvent({ path: "/api/unknown" }));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body ?? "")).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});

describe("core handler", () => {
  it("does not serve matching, which runs in its own Lambda", async () => {
    const res = await handler(apiEvent({ path: "/api/requests/x/matches" }));
    expect(res.statusCode).toBe(404);
  });
});
