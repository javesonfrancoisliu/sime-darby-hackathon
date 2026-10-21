import { describe, expect, it } from "vitest";
import { routes } from "./app";
import { handler } from "./matchingHandler";
import { matchingRoutes } from "./modules/matching/routes";
import { coreRoutes } from "./routes";
import { apiEvent } from "./test/event";

describe("matching handler", () => {
  it("serves personalized opportunities in the secret-owning matching Lambda", async () => {
    const res = await handler(apiEvent({ path: "/api/opportunities" }));
    expect(res.statusCode).not.toBe(404);
  });
  it("serves the matches route", async () => {
    const res = await handler(apiEvent({ path: "/api/requests/x/matches" }));
    expect(res.statusCode).not.toBe(404);
  });

  it("does not serve core routes", async () => {
    const res = await handler(apiEvent({ path: "/api/health" }));
    expect(res.statusCode).toBe(404);
  });
});

describe("route split", () => {
  it("shares only the opportunities feed: core keeps a rules-only copy so a deploy cannot 404", () => {
    const key = (route: { method: string; path: string }) => `${route.method} ${route.path}`;
    const core = new Set(coreRoutes.map(key));
    const matching = new Set(matchingRoutes.map(key));
    expect([...core].filter((entry) => matching.has(entry))).toEqual(["GET /api/opportunities"]);
  });

  it("lets the AI feed win over the rules-only copy in the local server", () => {
    const first = routes.find((route) => route.path === "/api/opportunities");
    expect(first).toBe(matchingRoutes.find((route) => route.path === "/api/opportunities"));
  });
});
