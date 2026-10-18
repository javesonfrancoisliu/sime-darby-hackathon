import { describe, expect, it } from "vitest";
import { APP_PATHS, homePathForRole, safeNextPath, signInUrl, startAuthFromEnv } from "./index";
import { isAuthConfigured } from "./config";

describe("homePathForRole", () => {
  it("sends each role to its app", () => {
    expect(homePathForRole("elder")).toBe(APP_PATHS.elder);
    expect(homePathForRole("volunteer")).toBe(APP_PATHS.volunteer);
    expect(homePathForRole("coordinator")).toBe(APP_PATHS.account);
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/elder/requests/1?x=1")).toBe("/elder/requests/1?x=1");
  });

  it("rejects other origins, protocol-relative and backslash paths", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "/\r//evil.example",
      "/\u0000x",
      "elder",
      "",
      null,
      undefined,
    ]) {
      expect(safeNextPath(bad)).toBeNull();
    }
  });
});

describe("signInUrl", () => {
  it("adds an encoded next path only when it is safe", () => {
    expect(signInUrl("/volunteer/profile")).toBe("/?next=%2Fvolunteer%2Fprofile");
    expect(signInUrl("//evil.example")).toBe("/");
    expect(signInUrl()).toBe("/");
  });
});

describe("startAuthFromEnv", () => {
  it("returns undefined without Cognito settings", () => {
    expect(startAuthFromEnv({})).toBeUndefined();
  });

  it("configures Cognito and returns the session hooks", () => {
    const started = startAuthFromEnv({
      VITE_COGNITO_REGION: "ap-southeast-5",
      VITE_COGNITO_USER_POOL_ID: "ap-southeast-5_example",
      VITE_COGNITO_CLIENT_ID: "exampleclientid",
    });
    expect(started).toBeDefined();
    expect(isAuthConfigured()).toBe(true);
  });
});
