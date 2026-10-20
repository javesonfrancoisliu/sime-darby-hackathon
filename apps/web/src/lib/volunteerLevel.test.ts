import { describe, expect, it } from "vitest";
import { volunteerLevel } from "./volunteerLevel";

describe("volunteer levels", () => {
  it.each([
    [0, 1, 3],
    [2, 1, 3],
    [3, 2, 10],
    [9, 2, 10],
    [10, 3, 25],
    [24, 3, 25],
    [25, 4, null],
    [100, 4, null],
  ])("maps %i completed tasks to level %i", (completed, expected, next) => {
    const result = volunteerLevel(completed);
    expect(result.level).toBe(expected);
    expect(result.next?.minimum ?? null).toBe(next);
  });
});
