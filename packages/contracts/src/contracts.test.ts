import { describe, expect, it } from "vitest";
import { ErrorResponse, HealthResponse } from "./index";

describe("HealthResponse", () => {
  it("accepts a valid payload", () => {
    const parsed = HealthResponse.parse({
      status: "ok",
      service: "api",
      time: "2026-10-14T00:00:00.000Z",
    });
    expect(parsed.status).toBe("ok");
  });

  it("rejects a non-ok status and a non-ISO time", () => {
    expect(HealthResponse.safeParse({ status: "down", service: "api", time: "now" }).success).toBe(
      false,
    );
  });
});

describe("ErrorResponse", () => {
  it("rejects an unknown error code", () => {
    expect(ErrorResponse.safeParse({ error: { code: "TEAPOT", message: "x" } }).success).toBe(
      false,
    );
  });
});
