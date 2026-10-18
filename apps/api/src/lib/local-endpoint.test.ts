import { describe, expect, it } from "vitest";
import { isLoopbackEndpoint } from "./local-endpoint";

describe("isLoopbackEndpoint", () => {
  it("accepts local addresses", () => {
    for (const url of ["http://127.0.0.1:8000", "http://localhost:8000", "http://[::1]:8000"]) {
      expect(isLoopbackEndpoint(url)).toBe(true);
    }
  });

  it("rejects remote, lookalike, malformed and missing endpoints", () => {
    for (const url of [
      "https://dynamodb.ap-southeast-1.amazonaws.com",
      "http://localhost.evil.example",
      "http://10.0.0.5:8000",
      "not a url",
      "",
      undefined,
    ]) {
      expect(isLoopbackEndpoint(url)).toBe(false);
    }
  });
});
