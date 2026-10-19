import { describe, expect, it } from "vitest";

import { claimReward, normaliseRedemptions } from "./rewards";

const AT = "2026-10-20T10:00:00+08:00";

describe("normaliseRedemptions (migration)", () => {
  it("migrates the legacy string[] shape to records without inventing dates", () => {
    const result = normaliseRedemptions(["rwd-a", "rwd-b"]);
    expect(result).toEqual({ "rwd-a": {}, "rwd-b": {} });
    // Older claimed rewards are preserved but carry NO timestamp.
    expect(result["rwd-a"]?.redeemedAt).toBeUndefined();
  });

  it("passes through the new record shape unchanged", () => {
    const record = { "rwd-a": { redeemedAt: AT } };
    expect(normaliseRedemptions(record)).toEqual(record);
  });

  it("returns an empty record for unrecognised / empty input", () => {
    expect(normaliseRedemptions(null)).toEqual({});
    expect(normaliseRedemptions(undefined)).toEqual({});
    expect(normaliseRedemptions("nonsense")).toEqual({});
    expect(normaliseRedemptions(42)).toEqual({});
  });

  it("ignores non-string entries in a legacy array", () => {
    expect(normaliseRedemptions(["rwd-a", 5, null, "rwd-b"])).toEqual({
      "rwd-a": {},
      "rwd-b": {},
    });
  });
});

describe("claimReward", () => {
  it("adds a claim with a timestamp for a newly redeemed reward", () => {
    const next = claimReward({}, "rwd-a", AT);
    expect(next).toEqual({ "rwd-a": { redeemedAt: AT } });
  });

  it("is idempotent - does not overwrite an existing claim's timestamp", () => {
    const existing = { "rwd-a": { redeemedAt: AT } };
    const next = claimReward(existing, "rwd-a", "2026-11-01T00:00:00+08:00");
    expect(next).toBe(existing); // unchanged reference
    expect(next["rwd-a"]?.redeemedAt).toBe(AT);
  });

  it("preserves a migrated (timestamp-less) claim without adding a date", () => {
    const migrated = { "rwd-old": {} };
    const next = claimReward(migrated, "rwd-old", AT);
    expect(next["rwd-old"]?.redeemedAt).toBeUndefined();
  });

  it("does not mutate the input record", () => {
    const start = {};
    claimReward(start, "rwd-a", AT);
    expect(start).toEqual({});
  });
});
