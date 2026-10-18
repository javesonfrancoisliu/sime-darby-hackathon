import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, api } from "./client";

function mockFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("api client error normalisation", () => {
  it("uses relative /api paths", async () => {
    const fetchMock = vi.fn(async () => new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await api.listHelpRequests();
    expect(fetchMock).toHaveBeenCalledWith("/api/help-requests", expect.any(Object));
  });

  it("surfaces a structured ErrorResponse message and code (Req 9.2)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "No such request" } }), {
          status: 404,
        }),
    );
    await expect(api.getHelpRequest("x")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "No such request",
    });
  });

  it("falls back to a generic error for non-structured failures (Req 9.4)", async () => {
    mockFetch(() => new Response("boom", { status: 500 }));
    const err = await api.listHelpRequests().catch((e) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.code).toBe("INTERNAL");
    expect(err.message).toMatch(/try again/i);
  });

  it("falls back to a generic error when fetch rejects (network failure)", async () => {
    mockFetch(() => {
      throw new TypeError("network down");
    });
    const err = await api.listHelpRequests().catch((e) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.code).toBe("INTERNAL");
  });
});
