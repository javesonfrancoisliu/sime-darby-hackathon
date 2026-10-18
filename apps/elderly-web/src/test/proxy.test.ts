import { describe, expect, it } from "vitest";
import { API_PROXY_TARGET } from "../api/proxy";

describe("dev proxy", () => {
  it("targets the local backend API host", () => {
    expect(API_PROXY_TARGET).toBe("http://127.0.0.1:3001");
  });
});
