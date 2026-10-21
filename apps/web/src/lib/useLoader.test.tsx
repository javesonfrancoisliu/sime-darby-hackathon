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

  it("keeps the last good list when a background refresh fails, but a manual reload shows it", async () => {
    const load = vi
      .fn<(scope: string | null) => Promise<{ ok: boolean; n: number }>>()
      .mockResolvedValueOnce({ ok: true, n: 1 })
      .mockResolvedValueOnce({ ok: false, n: 0 })
      .mockResolvedValueOnce({ ok: false, n: 0 });
    const failed = (v: { ok: boolean }) => !v.ok;
    const { result } = renderHook(() => useLoader("u", load, true, LIVE_REFRESH_MS, failed));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.loaded?.value).toEqual({ ok: true, n: 1 });
    await act(() => vi.advanceTimersByTimeAsync(LIVE_REFRESH_MS));
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.loaded?.value).toEqual({ ok: true, n: 1 });
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.loaded?.value).toEqual({ ok: false, n: 0 });
  });

  it("still shows a failure on the very first load", async () => {
    const load = vi.fn().mockResolvedValue({ ok: false });
    const { result } = renderHook(() =>
      useLoader("u", load, true, LIVE_REFRESH_MS, (v: { ok: boolean }) => !v.ok),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.loaded?.value).toEqual({ ok: false });
  });
});
