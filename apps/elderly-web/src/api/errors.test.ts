import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiErrorCode } from "@sdh/api-client";
import { ErrorCode } from "@sdh/contracts";
import { toFriendlyError } from "./errors";

afterEach(() => vi.restoreAllMocks());

describe("toFriendlyError", () => {
  it("gives plain copy for every contract error code and for network failures", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const codes: ApiErrorCode[] = [...ErrorCode.options, "NETWORK", "BAD_RESPONSE", "HTTP_ERROR"];
    for (const code of codes) {
      const friendly = toFriendlyError(new ApiError(400, code, `raw ${code} text`));
      expect(friendly.code).toBe(code);
      expect(friendly.message).not.toContain("raw");
      expect(friendly.message.length).toBeGreaterThan(10);
    }
  });

  it("logs the raw error and does not show it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = new ApiError(500, "INTERNAL", "stack trace here");
    const friendly = toFriendlyError(raw);
    expect(warn).toHaveBeenCalledWith("API call failed:", raw);
    expect(friendly.message).not.toMatch(/stack trace/);
  });

  it("treats unknown throwables as a generic error", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(toFriendlyError(new TypeError("x")).code).toBe("INTERNAL");
  });
});
