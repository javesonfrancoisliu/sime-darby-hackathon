import { describe, expect, it, vi } from "vitest";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { collect, createAttemptGuard } from "./collect";
import { logger } from "../../src/lib/logger";

describe("approved collector guards (no live requests)", () => {
  it("records timeouts and fallback without retry or invented token usage", async () => {
    const warning = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    let calls = 0;
    try {
      const result = await collect(
        () => async (_request, signal) => {
          calls++;
          return new Promise((_resolve, reject) =>
            signal.addEventListener("abort", () => reject(new Error("mock abort")), { once: true }),
          );
        },
        () => undefined,
        5,
      );
      expect(calls).toBe(15);
      expect(result.outcomes.every((outcome) => outcome.fallback)).toBe(true);
      expect(result.run.records.every((record) => record.error && !record.usage)).toBe(true);
      expect(result.rawReport.summary.estimatedTotalUsd).toBeNull();
    } finally {
      warning.mockRestore();
    }
  });
  it("refuses duplicate scenarios and a sixteenth attempt", () => {
    const guard = createAttemptGuard();
    for (let i = 0; i < 15; i++) guard.claim(String(i));
    expect(guard.count).toBe(15);
    expect(() => guard.claim("16")).toThrow();
    expect(() => createAttemptGuard(0).claim("first")).toThrow();
    const once = createAttemptGuard();
    once.claim("same");
    expect(() => once.claim("same")).toThrow();
  });
  it("uses the production pipeline, captures raw data and identifies fallback without retry", async () => {
    const warning = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const calls: string[] = [];
    const checkpoint = vi.fn();
    try {
      const result = await collect(
        (id) => async () => {
          calls.push(id);
          if (id === "scenario-01") throw new Error("mock provider failure");
          return {
            model: "claude-haiku-5-5",
            content: [
              {
                type: "tool_use",
                name: "submit_ranking",
                input: {
                  ranking: [1, 2, 3].map((n) => ({
                    candidate: `c${n}`,
                    reason: "Nearby neighbour.",
                  })),
                },
              },
            ],
            usage: { input_tokens: 100, output_tokens: 30 },
            stop_reason: "tool_use",
          } as unknown as Message;
        },
        checkpoint,
      );
      expect(calls).toHaveLength(15);
      expect(new Set(calls).size).toBe(15);
      expect(result.outcomes[0]?.fallback).toBe(true);
      expect(result.run.records[0]?.error).toBe("Error");
      expect(result.rawReport.rows[0]?.jsonValid).toBe(false);
      expect(result.hybridReport.rows[0]?.strictValid).toBe(true);
      expect(result.outcomes.slice(1).every((r) => !r.fallback)).toBe(true);
      expect(checkpoint).toHaveBeenCalledWith(
        "scenario-02-raw",
        expect.objectContaining({ usage: expect.any(Object) }),
      );
    } finally {
      warning.mockRestore();
    }
  });
});
