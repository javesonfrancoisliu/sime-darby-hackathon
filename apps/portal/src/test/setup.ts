import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Account actions talk to Cognito, so every one is replaced; the pure helpers stay real.
vi.mock("@sdh/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sdh/auth")>();
  return {
    ...actual,
    signIn: vi.fn(),
    signUp: vi.fn(),
    confirmSignUp: vi.fn(),
    resendSignUpCode: vi.fn(),
    forgotPassword: vi.fn(),
    confirmForgotPassword: vi.fn(),
    changePassword: vi.fn(),
    changeEmail: vi.fn(),
    confirmEmailChange: vi.fn(),
    resendEmailChangeCode: vi.fn(),
    getAccountEmail: vi.fn(),
  };
});

// Full page loads cannot run in jsdom; tests assert on the path instead.
vi.mock("../lib/navigate", () => ({ navigateToApp: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
