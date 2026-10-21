import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LIVE_REFRESH_MS, useLoader } from "./useLoader";

const setVisibility = (state: "visible" | "hidden") =>
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility("visible");
});
afterEach(() => {
  vi.useRealTimers();
  setVisibility("visible");
});

describe("useLoader live refresh", () => {
  it("loads once and never again when refresh is not requested", async () => {
    const load = vi.fn().mockResolvedValue(1);
    renderHook(() => useLoader("u", load));
    await act(() => vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS * 3));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads on the interval while the tab is visible", async () => {
    const load = vi.fn().mockResolvedValue(1);
    renderHook(() => useLoader("u", load, true, LIVE_REFRESH_MS));
    await act(() => vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS));
    expect(load).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS));
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("skips the interval while the tab is hidden and catches up when it is shown", async () => {
    const load = vi.fn().mockResolvedValue(1);
    renderHook(() => useLoader("u", load, true, LIVE_REFRESH_MS));
    setVisibility("hidden");
    await act(() => vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS * 2));
    expect(load).toHaveBeenCalledTimes(1);
    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reloads on focus but not twice for focus and visibility together", async () => {
    const load = vi.fn().mockResolvedValue(1);
    renderHook(() => useLoader("u", load, true, LIVE_REFRESH_MS));
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("does not poll when disabled and stops after unmount", async () => {
    const load = vi.fn().mockResolvedValue(1);
    renderHook(() => useLoader(null, load, false, LIVE_REFRESH_MS));
    await act(() => vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS * 2));
    expect(load).not.toHaveBeenCalled();

    const live = vi.fn().mockResolvedValue(1);
    const { unmount } = renderHook(() => useLoader("u", live, true, LIVE_REFRESH_MS));
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS * 2));
    expect(live).toHaveBeenCalledTimes(1);
  });
});
