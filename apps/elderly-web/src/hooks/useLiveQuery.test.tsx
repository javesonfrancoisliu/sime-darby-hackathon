import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ApiError } from "@sdh/api-client";
import { useLiveQuery } from "./useLiveQuery";

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLiveQuery", () => {
  it("loads once, then refreshes on the interval", async () => {
    const load = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    const { result } = renderHook(() => useLiveQuery("k", load, 10_000));
    expect(result.current.status).toBe("loading");

    await act(async () => {});
    expect(result.current.data).toBe("first");
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe("second");
  });

  it("does not refresh when no interval is given", async () => {
    const load = vi.fn().mockResolvedValue("x");
    renderHook(() => useLiveQuery("k", load));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("stops polling while the page is hidden and catches up when it shows again", async () => {
    const load = vi.fn().mockResolvedValue("x");
    renderHook(() => useLiveQuery("k", load, 10_000));
    await act(async () => {});
    expect(load).toHaveBeenCalledTimes(1);

    act(() => setVisibility("hidden"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => setVisibility("visible"));
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("does not start polling when it mounts on a hidden page", async () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    const load = vi.fn().mockResolvedValue("x");
    renderHook(() => useLiveQuery("k", load, 10_000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("cleans up its timer and listener on unmount", async () => {
    const load = vi.fn().mockResolvedValue("x");
    const { unmount } = renderHook(() => useLiveQuery("k", load, 10_000));
    await act(async () => {});
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
      setVisibility("hidden");
      setVisibility("visible");
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("ignores a slow old reply that arrives after a newer one", async () => {
    let resolveSlow: (value: string) => void = () => {};
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string>((resolve) => (resolveSlow = resolve)))
      .mockResolvedValueOnce("new");
    const { result } = renderHook(() => useLiveQuery("k", load, 10_000));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.data).toBe("new");

    await act(async () => resolveSlow("old"));
    expect(result.current.data).toBe("new");
  });

  it("drops a reply that was in flight when update changed the data", async () => {
    let resolveInFlight: (value: string) => void = () => {};
    const load = vi
      .fn()
      .mockResolvedValueOnce("open")
      .mockImplementationOnce(() => new Promise<string>((resolve) => (resolveInFlight = resolve)));
    const { result } = renderHook(() => useLiveQuery("k", load, 10_000));
    await act(async () => {});

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    act(() => result.current.update(() => "cancelled"));
    await act(async () => resolveInFlight("open"));
    expect(result.current.data).toBe("cancelled");
  });

  it("keeps showing data when a refresh fails, and reports a first-load failure", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce("shown")
      .mockRejectedValueOnce(new ApiError(0, "NETWORK", "offline"));
    const { result } = renderHook(() => useLiveQuery("k", load, 10_000));
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.status).toBe("success");
    expect(result.current.data).toBe("shown");

    const failing = vi.fn().mockRejectedValue(new ApiError(0, "NETWORK", "offline"));
    const second = renderHook(() => useLiveQuery("other", failing));
    await act(async () => {});
    expect(second.result.current.status).toBe("error");
    expect(second.result.current.error?.message).toMatch(/cannot reach/i);
  });

  it("refetch shows loading and loads again", async () => {
    const load = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("b");
    const { result } = renderHook(() => useLiveQuery("k", load));
    await act(async () => {});
    act(() => result.current.refetch());
    expect(result.current.status).toBe("loading");
    await act(async () => {});
    expect(result.current.data).toBe("b");
  });

  it("starts fresh when the key changes", async () => {
    const load = vi.fn().mockResolvedValueOnce("one").mockResolvedValueOnce("two");
    const { result, rerender } = renderHook(({ k }) => useLiveQuery(k, load), {
      initialProps: { k: "one" },
    });
    await act(async () => {});
    expect(result.current.data).toBe("one");
    rerender({ k: "two" });
    expect(result.current.status).toBe("loading");
    expect(result.current.data).toBeUndefined();
    await act(async () => {});
    expect(result.current.data).toBe("two");
  });
});
