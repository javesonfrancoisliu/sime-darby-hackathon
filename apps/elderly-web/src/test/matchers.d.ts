import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// Vitest 5's Assertion<R, T> has two type parameters and extends Matchers<R, T>.
// jest-dom's bundled augmentation targets the older single-param Assertion, so
// we augment the matchers here against the correct shape. These interfaces are
// intentionally empty - they only merge jest-dom matchers into Vitest's types.
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<R = void, T = unknown> extends TestingLibraryMatchers<T, R> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
