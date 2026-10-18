import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import {
  useCancelHelpRequest,
  useCreateHelpRequest,
  useHelpRequests,
} from "./useHelpRequests";
import { ApiRequestError, api } from "../api/client";
import type { HelpRequest } from "../api/client";

const sample: HelpRequest = {
  id: "1",
  category: "groceries",
  description: "Milk and bread",
  status: "pending",
};

afterEach(() => vi.restoreAllMocks());

describe("useHelpRequests", () => {
  it("transitions loading -> success", async () => {
    vi.spyOn(api, "listHelpRequests").mockResolvedValue([sample]);
    const { result } = renderHook(() => useHelpRequests());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toEqual([sample]);
  });

  it("transitions loading -> error and can refetch", async () => {
    const spy = vi
      .spyOn(api, "listHelpRequests")
      .mockRejectedValueOnce(new ApiRequestError({ code: "INTERNAL", message: "boom" }))
      .mockResolvedValueOnce([sample]);
    const { result } = renderHook(() => useHelpRequests());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.message).toBe("boom");
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("useCreateHelpRequest", () => {
  it("returns the created request on success", async () => {
    vi.spyOn(api, "createHelpRequest").mockResolvedValue(sample);
    const { result } = renderHook(() => useCreateHelpRequest());
    let created: HelpRequest | undefined;
    await act(async () => {
      created = await result.current.submit({ category: "groceries", description: "Milk" });
    });
    expect(created).toEqual(sample);
    expect(result.current.status).toBe("success");
  });

  it("captures the error on failure (Req 5.6)", async () => {
    vi.spyOn(api, "createHelpRequest").mockRejectedValue(
      new ApiRequestError({ code: "VALIDATION_FAILED", message: "bad" }),
    );
    const { result } = renderHook(() => useCreateHelpRequest());
    await act(async () => {
      await expect(
        result.current.submit({ category: "groceries", description: "x" }),
      ).rejects.toBeTruthy();
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("bad");
  });
});

describe("useCancelHelpRequest", () => {
  it("returns the updated request on success (Req 8.3)", async () => {
    vi.spyOn(api, "cancelHelpRequest").mockResolvedValue({ ...sample, status: "cancelled" });
    const { result } = renderHook(() => useCancelHelpRequest());
    let updated: HelpRequest | undefined;
    await act(async () => {
      updated = await result.current.cancel("1");
    });
    expect(updated?.status).toBe("cancelled");
  });
});
