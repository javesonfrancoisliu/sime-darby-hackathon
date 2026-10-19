import { describe, expect, it } from "vitest";
import { at, hoursAgo } from "./content/dates";
import {
  authHeaders,
  errorCodeOf,
  isLoopbackUrl,
  parseBaseUrl,
  resolveAuth,
  validateAllContent,
} from "./loader-lib";
import { challenges } from "./content/challenges";

const DAY_MS = 86_400_000;

describe("at", () => {
  const now = Date.parse("2026-10-19T03:00:00.000Z");
  it("returns Malaysia local hour as UTC", () => {
    expect(at(0, 9, 0, now)).toBe("2026-10-19T01:00:00.000Z");
    expect(at(2, 9, 30, now)).toBe("2026-10-21T01:30:00.000Z");
  });
  it("moves with the day offset and goes back for negatives", () => {
    expect(Date.parse(at(45, 9, 0, now)) - Date.parse(at(0, 9, 0, now))).toBe(45 * DAY_MS);
    expect(Date.parse(at(-2, 9, 0, now))).toBeLessThan(now);
  });
  it("hoursAgo is in the past", () => {
    expect(hoursAgo(2, now)).toBe("2026-10-19T01:00:00.000Z");
  });
});

describe("loopback guard and auth", () => {
  it("detects loopback URLs only", () => {
    expect(isLoopbackUrl("http://localhost:3001")).toBe(true);
    expect(isLoopbackUrl("http://127.0.0.1:3001")).toBe(true);
    expect(isLoopbackUrl("https://api.example.com")).toBe(false);
    expect(isLoopbackUrl("http://localhost.evil.com")).toBe(false);
    expect(isLoopbackUrl("not a url")).toBe(false);
  });
  it("uses the demo header locally and a bearer token when deployed", () => {
    const local = resolveAuth("http://localhost:3001", { COORDINATOR_DEMO_USER_ID: "u1" });
    expect(local.ok && authHeaders(local.auth)).toEqual({ "x-demo-user": "u1" });
    const remote = resolveAuth("https://api.example.com", {
      COORDINATOR_TOKEN: "t",
      COORDINATOR_DEMO_USER_ID: "u1",
    });
    expect(remote.ok && authHeaders(remote.auth)).toEqual({ authorization: "Bearer t" });
  });
  it("refuses remote URLs without a token and plain http", () => {
    expect(resolveAuth("https://api.example.com", {}).ok).toBe(false);
    expect(resolveAuth("http://api.example.com", { COORDINATOR_TOKEN: "t" }).ok).toBe(false);
  });
  it("never leaks the token in an error", () => {
    const res = resolveAuth("http://api.example.com", { COORDINATOR_TOKEN: "secret-token" });
    expect(JSON.stringify(res)).not.toContain("secret-token");
  });
});

describe("cli helpers", () => {
  it("parses --base-url in both forms and trims slashes", () => {
    expect(parseBaseUrl(["--base-url", "https://a.b/"])).toBe("https://a.b");
    expect(parseBaseUrl(["--base-url=http://localhost:3001"])).toBe("http://localhost:3001");
    expect(parseBaseUrl([])).toBeUndefined();
  });
  it("shows only a short error code", () => {
    expect(errorCodeOf({ error: { code: "FORBIDDEN", message: "x" } })).toBe("FORBIDDEN");
    expect(errorCodeOf({ error: { code: "bad token abc" } })).toBe("UNKNOWN");
    expect(errorCodeOf(undefined)).toBe("UNKNOWN");
  });
});

describe("content", () => {
  it("validates every item against the contracts", () => {
    const c = validateAllContent();
    expect(c.notices).toHaveLength(6);
    expect(c.safetyReadings).toHaveLength(6);
    expect(c.facilityReports).toHaveLength(6);
    expect(c.events).toHaveLength(3);
    expect(c.quiz.questions).toHaveLength(4);
    expect(c.challenges).toHaveLength(7);
    expect(c.rewards).toHaveLength(6);
    expect(c.badges).toHaveLength(6);
  });
  it("reaches at least 45 days ahead and keeps events in the future", () => {
    const horizon = Date.now() + 45 * DAY_MS;
    const ends = challenges().map((c) => Date.parse(c.endsOn));
    expect(Math.max(...ends)).toBeGreaterThanOrEqual(horizon);
    const c = validateAllContent();
    for (const e of c.events) expect(Date.parse(e.startsAt)).toBeGreaterThan(Date.now());
  });
  it("covers the required mix", () => {
    const c = validateAllContent();
    expect(c.challenges.filter((x) => x.body.mode === "team")).toHaveLength(3);
    expect(c.challenges.filter((x) => x.body.mode === "individual")).toHaveLength(4);
    expect(c.challenges.every((x) => x.body.requiresVerification === false)).toBe(true);
    expect(c.challenges.filter((x) => x.quizTitle)).toHaveLength(1);
    expect(new Set(c.facilityReports.map((f) => f.status)).size).toBe(3);
    expect(c.rewards.some((r) => r.minVolunteerTasks === 2)).toBe(true);
    expect(c.events.every((e) => e.purpose === "volunteer_drive" && e.organiser)).toBe(true);
  });
});
