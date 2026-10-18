import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, DEFAULT_TIMEOUT_MS, MUTATION_TIMEOUT_MS } from "./fetch";
import { DEMO_USER_STORAGE_KEY } from "./storage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("sends the demo header when signed in", async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, "u1");
    fetchMock.mockResolvedValue(json({ ok: true }));
    await expect(apiFetch("/api/x")).resolves.toEqual({ ok: true });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-Demo-User"]).toBe("u1");
  });

  it("omits the header when signed out or userId is null", async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, "u1");
    fetchMock.mockResolvedValue(json({}));
    await apiFetch("/api/x", { userId: null });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).not.toHaveProperty("X-Demo-User");
  });

  it("maps an error body to ApiError", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "FORBIDDEN", message: "Nope" } }, 403));
    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "Nope",
    });
  });

  it("treats a code outside the contract as HTTP_ERROR", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "WEIRD", message: "odd" } }, 400));
    await expect(apiFetch("/api/x")).rejects.toMatchObject({ code: "HTTP_ERROR", message: "odd" });
  });

  it("falls back to a generic message for an error without a body", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 502 }));
    await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 502, code: "HTTP_ERROR" });
  });

  it("surfaces a network failure as NETWORK", async () => {
    fetchMock.mockRejectedValue(new TypeError("failed"));
    const err = await apiFetch("/api/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: "NETWORK" });
  });

  it("aborts after the timeout and reports NETWORK", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_path: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("a", "AbortError")));
        }),
    );
    const pending = apiFetch("/api/x", { timeoutMs: 100 }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(101);
    await expect(pending).resolves.toMatchObject({ status: 0, code: "NETWORK" });
  });

  it("gives writes a longer timeout than reads", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_path: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("a", "AbortError")));
        }),
    );
    const read = apiFetch("/api/x").catch((e: unknown) => e);
    const write = apiFetch("/api/x", { method: "POST", body: {} }).catch((e: unknown) => e);
    let writeSettled = false;
    void write.then(() => (writeSettled = true));
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    await expect(read).resolves.toMatchObject({ code: "NETWORK" });
    expect(writeSettled).toBe(false);
    await vi.advanceTimersByTimeAsync(MUTATION_TIMEOUT_MS);
    await expect(write).resolves.toMatchObject({ code: "NETWORK" });
  });

  it("throws BAD_RESPONSE when a 2xx body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 200, code: "BAD_RESPONSE" });
  });

  it("still works when storage access throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    fetchMock.mockResolvedValue(json({ ok: 1 }));
    await expect(apiFetch("/api/x")).resolves.toEqual({ ok: 1 });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).not.toHaveProperty("X-Demo-User");
  });
});
