import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// jest-dom resolves its own vitest copy under pnpm, so the matchers are typed here.
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
