import { afterEach, describe, expect, it, vi } from "vitest";
import { config, isLoopbackEndpoint } from "./config";

afterEach(() => vi.unstubAllEnvs());

describe("config.demoAuthEnabled", () => {
  it("is true only for the exact string true", () => {
    vi.stubEnv("DEMO_AUTH_ENABLED", "true");
    expect(config.demoAuthEnabled).toBe(true);
    for (const value of ["", "TRUE", "True", "1", "yes", "false", " true"]) {
      vi.stubEnv("DEMO_AUTH_ENABLED", value);
      expect(config.demoAuthEnabled).toBe(false);
    }
  });

  it("is false when unset", () => {
    vi.stubEnv("DEMO_AUTH_ENABLED", undefined);
    expect(config.demoAuthEnabled).toBe(false);
  });

  it("is false whenever Cognito sign-in is configured", () => {
    vi.stubEnv("DEMO_AUTH_ENABLED", "true");
    vi.stubEnv("COGNITO_USER_POOL_ID", "ap-southeast-5_example");
    vi.stubEnv("COGNITO_CLIENT_ID", "exampleclientid");
    expect(config.demoAuthEnabled).toBe(false);
  });
});

describe("config Cognito values", () => {
  it("are undefined when unset or empty", () => {
    vi.stubEnv("COGNITO_USER_POOL_ID", "");
    vi.stubEnv("COGNITO_CLIENT_ID", undefined);
    expect(config.cognitoUserPoolId).toBeUndefined();
    expect(config.cognitoClientId).toBeUndefined();
    expect(config.bearerAuthEnabled).toBe(false);
  });

  it("enable bearer auth only when both are set", () => {
    vi.stubEnv("COGNITO_USER_POOL_ID", "pool");
    vi.stubEnv("COGNITO_CLIENT_ID", undefined);
    expect(config.bearerAuthEnabled).toBe(false);
    vi.stubEnv("COGNITO_CLIENT_ID", "client");
    expect(config.cognitoUserPoolId).toBe("pool");
    expect(config.cognitoClientId).toBe("client");
    expect(config.bearerAuthEnabled).toBe(true);
  });
});

describe("isLoopbackEndpoint", () => {
  it("accepts localhost and 127.0.0.1 only", () => {
    expect(isLoopbackEndpoint("http://127.0.0.1:8000")).toBe(true);
    expect(isLoopbackEndpoint("http://localhost:8000")).toBe(true);
    expect(isLoopbackEndpoint("https://dynamodb.ap-southeast-1.amazonaws.com")).toBe(false);
    expect(isLoopbackEndpoint("http://localhost.evil.com")).toBe(false);
    expect(isLoopbackEndpoint("not a url")).toBe(false);
    expect(isLoopbackEndpoint(undefined)).toBe(false);
  });
});
