import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Raw API errors are logged for developers; keep test output readable.
// jsdom does not implement window.scrollTo; the spy lets tests assert it.
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
