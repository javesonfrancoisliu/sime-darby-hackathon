import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAccessTokenProvider } from "./fetch";
import { SESSION_RETRY_MS, SessionProvider, useSession, type SessionAuth } from "./session";
import { DEMO_USER_STORAGE_KEY, registerScopedKey, SIGNED_OUT_SCOPE } from "./storage";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

const me = { id: "u1", name: "Sam" };
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  setAccessTokenProvider(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("session", () => {
  it("signs in, loads /api/me, then signs out and clears scoped keys", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(me)));
    const scoped = registerScopedKey("tc.test");
    window.localStorage.setItem(scoped("u1"), "mine");
    window.localStorage.setItem("other", "keep");
    window.localStorage.setItem(scoped(SIGNED_OUT_SCOPE), "demo");
    window.localStorage.setItem("tc.test", "legacy");

    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.status).toBe("signed_out");

    act(() => result.current.signIn("u1"));
    expect(window.localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBe("u1");
    await waitFor(() => expect(result.current.status).toBe("signed_in"));

    act(() => result.current.signOut());
    expect(result.current.status).toBe("signed_out");
    expect(window.localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(scoped("u1"))).toBeNull();
    expect(window.localStorage.getItem("other")).toBe("keep");
    expect(window.localStorage.getItem(scoped(SIGNED_OUT_SCOPE))).toBe("demo");
    expect(window.localStorage.getItem("tc.test")).toBeNull();
  });

  it("drops a stored user the API no longer knows", async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, "gone");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(reply({ error: { code: "UNAUTHENTICATED", message: "x" } }, 401)),
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("signed_out"));
    expect(window.localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBeNull();
  });

  it("reports an error status when the profile cannot load", async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, "u1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("survives blocked storage", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(me)));
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.signIn("u1"));
    await waitFor(() => expect(result.current.status).toBe("signed_in"));
  });

  it("replaces the signed-in user with a fresher copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(me)));
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.signIn("u1"));
    await waitFor(() => expect(result.current.status).toBe("signed_in"));

    act(() => result.current.updateUser({ ...me, name: "Sam Lee" } as never));
    expect(result.current.user?.name).toBe("Sam Lee");

    act(() => result.current.updateUser({ id: "u2", name: "Other" } as never));
    expect(result.current.user?.name).toBe("Sam Lee");
  });
});

describe("session refresh in demo mode", () => {
  it("reloads /api/me for the chosen demo user", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(me))
      .mockResolvedValueOnce(reply({ ...me, name: "Sam Lee" }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useSession(), { wrapper });
    act(() => result.current.signIn("u1"));
    await waitFor(() => expect(result.current.status).toBe("signed_in"));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.user?.name).toBe("Sam Lee"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("session recovery after a failed load", () => {
  // The API is down until `up.value` is set, then answers with the profile.
  function flakyApi() {
    const up = { value: false };
    const fetchMock = vi.fn(async () => {
      if (!up.value) throw new TypeError("down");
      return reply(me);
    });
    vi.stubGlobal("fetch", fetchMock);
    return { up, fetchMock };
  }

  it("clears the error by itself when the tab regains focus and the API is back", async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, "u1");
    const { up } = flakyApi();
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));
    up.value = true;
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(result.current.status).toBe("signed_in"));
  });

  it("asks again on the retry interval only while the session is in error", async () => {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, "u1");
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const { up } = flakyApi();
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));
    const retry = setIntervalSpy.mock.calls.find(([, ms]) => ms === SESSION_RETRY_MS)?.[0];
    expect(retry).toBeTypeOf("function");
    up.value = true;
    act(() => {
      (retry as () => void)();
    });
    await waitFor(() => expect(result.current.status).toBe("signed_in"));
  });
});

describe("session in token mode", () => {
  function setup(token: string | null) {
    const auth: SessionAuth = {
      getAccessToken: vi.fn(async () => token),
      signOut: vi.fn(async () => {}),
    };
    setAccessTokenProvider(auth.getAccessToken);
    const tokenWrapper = ({ children }: { children: ReactNode }) => (
      <SessionProvider auth={auth}>{children}</SessionProvider>
    );
    return { auth, tokenWrapper };
  }

  it("is signed out without a token and never calls the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { tokenWrapper } = setup(null);
    const { result } = renderHook(() => useSession(), { wrapper: tokenWrapper });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("signed_out"));
    expect(result.current.userId).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads /api/me with the bearer token and uses the user id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(me));
    vi.stubGlobal("fetch", fetchMock);
    const { tokenWrapper } = setup("tok");
    const { result } = renderHook(() => useSession(), { wrapper: tokenWrapper });
    await waitFor(() => expect(result.current.status).toBe("signed_in"));
    expect(result.current.userId).toBe("u1");
    expect(result.current.user).toEqual(me);
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
  });

  it("reports profile_required, then loads the user after refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply({ error: { code: "PROFILE_REQUIRED", message: "x" } }, 403))
      .mockResolvedValueOnce(reply(me));
    vi.stubGlobal("fetch", fetchMock);
    const { tokenWrapper } = setup("tok");
    const { result } = renderHook(() => useSession(), { wrapper: tokenWrapper });
    await waitFor(() => expect(result.current.status).toBe("profile_required"));
    expect(result.current.user).toBeNull();

    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.status).toBe("signed_in"));
    expect(result.current.userId).toBe("u1");
  });

  it("treats UNAUTHENTICATED as signed out and other failures as an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(reply({ error: { code: "UNAUTHENTICATED", message: "x" } }, 401)),
    );
    const first = setup("tok");
    const a = renderHook(() => useSession(), { wrapper: first.tokenWrapper });
    await waitFor(() => expect(a.result.current.status).toBe("signed_out"));

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    const second = setup("tok");
    const b = renderHook(() => useSession(), { wrapper: second.tokenWrapper });
    await waitFor(() => expect(b.result.current.status).toBe("error"));
    expect(b.result.current.error).toBeTruthy();
  });

  it("signs out through auth, clears scoped keys and resets state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(me)));
    const scoped = registerScopedKey("tc.token-test");
    window.localStorage.setItem(scoped("u1"), "mine");
    const { auth, tokenWrapper } = setup("tok");
    const { result } = renderHook(() => useSession(), { wrapper: tokenWrapper });
    await waitFor(() => expect(result.current.status).toBe("signed_in"));

    await act(async () => {
      await result.current.signOut();
    });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("signed_out");
    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(window.localStorage.getItem(scoped("u1"))).toBeNull();
  });

  it("still signs out locally when auth.signOut fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(me)));
    const { auth, tokenWrapper } = setup("tok");
    vi.mocked(auth.signOut).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSession(), { wrapper: tokenWrapper });
    await waitFor(() => expect(result.current.status).toBe("signed_in"));
    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.status).toBe("signed_out");
  });

  it("replaces the signed-in user with a fresher copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(me)));
    const { tokenWrapper } = setup("tok");
    const { result } = renderHook(() => useSession(), { wrapper: tokenWrapper });
    await waitFor(() => expect(result.current.status).toBe("signed_in"));
    act(() => result.current.updateUser({ ...me, name: "Sam Lee" } as never));
    expect(result.current.user?.name).toBe("Sam Lee");
  });
});
