import { describe, expect, it, vi } from "vitest";
import { HttpError, ok, type Route } from "./lib/http";
import { createRouter, type RawRequest } from "./router";

const request = (overrides: Partial<RawRequest>): RawRequest => ({
  method: "GET",
  path: "/",
  query: {},
  headers: {},
  rawBody: undefined,
  ...overrides,
});

const routes: Route[] = [
  { method: "GET", path: "/api/items/{id}", handler: (req) => ok({ id: req.params.id }) },
  { method: "POST", path: "/api/items", handler: (req) => ok(req.body, 201) },
  {
    method: "POST",
    path: "/api/items/{id}/accept",
    handler: () => {
      throw new HttpError("CONFLICT", "Already accepted");
    },
  },
  {
    method: "GET",
    path: "/api/boom",
    handler: () => {
      throw new Error("db password leaked in message");
    },
  },
];

const dispatch = createRouter(routes);

describe("router", () => {
  it("matches path params and decodes them", async () => {
    const res = await dispatch(request({ path: "/api/items/a%20b" }));
    expect(res).toEqual({ status: 200, body: { id: "a b" } });
  });

  it("passes the parsed JSON body", async () => {
    const res = await dispatch(request({ method: "POST", path: "/api/items", rawBody: '{"a":1}' }));
    expect(res).toEqual({ status: 201, body: { a: 1 } });
  });

  it("returns 404 for unknown paths and wrong methods", async () => {
    expect((await dispatch(request({ path: "/api/nope" }))).status).toBe(404);
    expect((await dispatch(request({ method: "DELETE", path: "/api/items/1" }))).status).toBe(404);
  });

  it("returns 400 for malformed percent-encoding in a path param", async () => {
    const res = await dispatch(request({ path: "/api/items/%E0%A4%A" }));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await dispatch(request({ method: "POST", path: "/api/items", rawBody: "{" }));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
  });

  it("maps HttpError to its status", async () => {
    const res = await dispatch(request({ method: "POST", path: "/api/items/1/accept" }));
    expect(res).toEqual({
      status: 409,
      body: { error: { code: "CONFLICT", message: "Already accepted" } },
    });
  });

  it("hides unexpected error details behind a 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await dispatch(request({ path: "/api/boom" }));
    expect(res).toEqual({
      status: 500,
      body: { error: { code: "INTERNAL", message: "Something went wrong" } },
    });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
