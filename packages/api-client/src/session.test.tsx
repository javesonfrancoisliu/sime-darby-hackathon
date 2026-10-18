import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionProvider, useSession } from "./session";
import { DEMO_USER_STORAGE_KEY, registerScopedKey, SIGNED_OUT_SCOPE } from "./storage";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

const me = { id: "u1", name: "Sam" };
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => window.localStorage.clear());
afterEach(() => {
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
