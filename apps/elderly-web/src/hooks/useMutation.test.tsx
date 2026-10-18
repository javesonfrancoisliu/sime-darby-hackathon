import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ApiError } from "@sdh/api-client";
import { useMutation } from "./useMutation";

describe("useMutation", () => {
  it("ignores a second call while the first is still sending", async () => {
    let finish: (value: string) => void = () => {};
    const action = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useMutation(action));

    let first: Promise<string | undefined> = Promise.resolve(undefined);
    let second: string | undefined = "unset";
    await act(async () => {
      first = result.current.run();
      second = await result.current.run();
    });
    expect(result.current.status).toBe("loading");
    expect(second).toBeUndefined();
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish("done");
      await first;
    });
    expect(result.current.status).toBe("success");
  });

  it("allows another call once the first has finished", async () => {
    const action = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(() => useMutation(action));
    await act(async () => {
      await result.current.run();
    });
    await act(async () => {
      await result.current.run();
    });
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("reports a friendly error and can be retried", async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(409, "CONFLICT", "raw text"))
      .mockResolvedValueOnce("ok");
    const { result } = renderHook(() => useMutation(action));
    await act(async () => {
      expect(await result.current.run()).toBeUndefined();
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).not.toContain("raw");
    await act(async () => {
      expect(await result.current.run()).toBe("ok");
    });
    expect(result.current.status).toBe("success");
  });
});
