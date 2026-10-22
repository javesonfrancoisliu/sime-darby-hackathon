import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { credentialFileIgnored, type GitRunner } from "./demo-personas-lib";

const API_DIR = fileURLToPath(new URL("..", import.meta.url));
const ENTRY = fileURLToPath(new URL("./demo-personas.ts", import.meta.url));
const POOL = "ap-southeast-5_AbCdEf123";
const SECRET_LIKE = /password|bearer|token/i;

// Runs the real entry point in its own process; only commands that stop before any network call.
function runEntry(args: string[], env: Record<string, string> = {}) {
  const res = spawnSync(process.execPath, ["--import", "tsx", ENTRY, ...args], {
    cwd: API_DIR,
    env: { PATH: process.env.PATH ?? "", ...env },
    encoding: "utf8",
    timeout: 60_000,
  });
  return { status: res.status, out: res.stdout, err: res.stderr };
}

describe("demo personas entry point", () => {
  it("is a dry run without --yes and prints the plan only", () => {
    const res = runEntry(["--local", "--base-url", "http://localhost:3001"]);
    expect(res.status).toBe(0);
    expect(res.out).toContain("Add --yes to proceed.");
    expect(res.out).not.toContain("(local, pass seed)");
    expect(res.err).toBe("");
  });

  it("stays a dry run for a cognito target and never prints a secret", () => {
    const res = runEntry(
      [
        "--cognito",
        "--base-url",
        "https://dev.example.com",
        "--user-pool-id",
        POOL,
        "--client-id",
        "client123",
        "--region",
        "ap-southeast-5",
        "--i-know-this-is-dev",
      ],
      { DEMO_POOL_ALLOW_PATTERN: `^${POOL}$` },
    );
    expect(res.status).toBe(0);
    expect(res.out).toContain("Add --yes to proceed.");
    expect(res.out).not.toContain(`Pool ${POOL}`);
    // The plan describes passwords but carries no value.
    expect(res.out.match(SECRET_LIKE)?.length ?? 0).toBeGreaterThan(0);
    expect(res.out).not.toMatch(/[A-Za-z0-9]{24,}/);
  });

  it("prints the error and usage on stderr and exits 1 for a bad option", () => {
    const res = runEntry(["--local", "--base-url", "http://localhost:3001", "--nope"]);
    expect(res.status).toBe(1);
    expect(res.err).toContain("Unknown option --nope");
    expect(res.err).toContain("Usage");
    expect(res.out).toBe("");
  });

  it("refuses a pool that the allow pattern does not name", () => {
    const res = runEntry(
      [
        "--cognito",
        "--base-url",
        "https://dev.example.com",
        "--user-pool-id",
        POOL,
        "--client-id",
        "client123",
        "--region",
        "ap-southeast-5",
        "--i-know-this-is-dev",
        "--yes",
      ],
      { DEMO_POOL_ALLOW_PATTERN: "^ap-southeast-5_Other$" },
    );
    expect(res.status).toBe(1);
    expect(res.err).toContain("does not match DEMO_POOL_ALLOW_PATTERN");
    expect(res.out).toBe("");
  });
});

describe("credentialFileIgnored", () => {
  const runner =
    (status: number | null): GitRunner =>
    () => ({ status });
  it("accepts a file that git says is ignored", () => {
    expect(credentialFileIgnored("docs/CREDENTIAL.md", runner(0))).toBe(true);
  });
  it("refuses a tracked or unknown file and a git failure", () => {
    expect(credentialFileIgnored("docs/CREDENTIAL.md", runner(1))).toBe(false);
    expect(credentialFileIgnored("docs/CREDENTIAL.md", runner(128))).toBe(false);
    expect(credentialFileIgnored("docs/CREDENTIAL.md", runner(null))).toBe(false);
  });
  it("asks git to check the exact path quietly", () => {
    const seen: string[][] = [];
    credentialFileIgnored("/repo/docs/CREDENTIAL.md", (command, args) => {
      seen.push([command, ...args]);
      return { status: 0 };
    });
    expect(seen).toEqual([["git", "check-ignore", "-q", "/repo/docs/CREDENTIAL.md"]]);
  });
});
