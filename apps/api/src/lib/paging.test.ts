import { describe, expect, it } from "vitest";
import { HttpError } from "./http";
import { decodeCursor, encodeCursor, toPaged } from "./paging";

const KEY = { PK: "USER#a", SK: "POINTS#1" };

describe("paging cursor", () => {
  it("round-trips a key", () => {
    expect(decodeCursor(encodeCursor(KEY), { PK: "USER#a" })).toEqual(KEY);
  });

  it("returns undefined for no cursor and no key", () => {
    expect(decodeCursor(undefined)).toBeUndefined();
    expect(encodeCursor(undefined)).toBeUndefined();
    expect(toPaged([1], undefined)).toEqual({ items: [1] });
  });

  it("rejects malformed, foreign-attribute and wrong-scope cursors", () => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    for (const bad of [
      "not-base64-json",
      encode([]),
      encode({}),
      encode({ PK: "x" }),
      encode({ PK: "x", SK: "y", other: "z" }),
      encode({ PK: "x", SK: 1 }),
    ]) {
      expect(() => decodeCursor(bad)).toThrow(HttpError);
    }
    expect(() => decodeCursor(encodeCursor(KEY), { PK: "USER#b" })).toThrow(HttpError);
  });
});
