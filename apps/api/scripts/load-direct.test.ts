import { User } from "@sdh/contracts";
import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_COORDINATOR_ID,
  dryRunLines,
  parseDirectArgs,
  resolveDirectTarget,
  syntheticCoordinator,
  validateAllContent,
} from "./loader-lib";

describe("direct args", () => {
  it("parses flags in both forms", () => {
    expect(
      parseDirectArgs(["--direct", "--table", "t1", "--region=ap-southeast-5", "--yes"]),
    ).toEqual({ direct: true, table: "t1", region: "ap-southeast-5", yes: true });
    expect(parseDirectArgs(["--base-url", "http://localhost:3001"])).toEqual({
      direct: false,
      table: undefined,
      region: undefined,
      yes: false,
    });
  });
  it("does not take a following flag as a value", () => {
    expect(parseDirectArgs(["--direct", "--table", "--yes"]).table).toBeUndefined();
  });
});

describe("direct target rules", () => {
  const args = (over = {}) => ({ direct: true, yes: true, ...over });
  it("needs a table and, for AWS, a region", () => {
    expect(resolveDirectTarget(args({ region: "r" }), {}).ok).toBe(false);
    expect(resolveDirectTarget(args({ table: "t" }), {}).ok).toBe(false);
    expect(resolveDirectTarget(args({ table: "t", region: "r" }), {})).toEqual({
      ok: true,
      table: "t",
      region: "r",
      local: false,
    });
  });
  it("falls back to TABLE_NAME", () => {
    const res = resolveDirectTarget(args({ region: "r" }), { TABLE_NAME: "env-table" });
    expect(res.ok && res.table).toBe("env-table");
  });
  it("targets DynamoDB Local for a loopback endpoint without a region", () => {
    const res = resolveDirectTarget(args({ table: "t" }), {
      DYNAMODB_ENDPOINT: "http://127.0.0.1:8000",
    });
    expect(res).toMatchObject({ ok: true, local: true, endpoint: "http://127.0.0.1:8000" });
  });
  it("refuses a non-loopback endpoint", () => {
    const res = resolveDirectTarget(args({ table: "t", region: "r" }), {
      DYNAMODB_ENDPOINT: "https://dynamodb.ap-southeast-5.amazonaws.com",
    });
    expect(res.ok).toBe(false);
  });
});

describe("synthetic coordinator", () => {
  it("is a valid coordinator User with the nil id", () => {
    const user = syntheticCoordinator();
    expect(User.safeParse(user).success).toBe(true);
    expect(user).toMatchObject({
      id: SYNTHETIC_COORDINATOR_ID,
      role: "coordinator",
      name: "Content loader",
      verification: "not_required",
    });
  });
});

describe("dry run", () => {
  it("lists the target and counts, and asks for --yes", () => {
    const target = resolveDirectTarget(
      { direct: true, yes: false, table: "t", region: "ap-southeast-5" },
      {},
    );
    if (!target.ok) throw new Error("target");
    const text = dryRunLines(target, validateAllContent()).join("\n");
    expect(text).toContain("table t, region ap-southeast-5");
    expect(text).toContain("notices: 6");
    expect(text).toContain("Add --yes to proceed.");
  });
});
