import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scenarios } from "../../../scripts/matching-benchmark/dataset";
import { logger } from "../../lib/logger";
import { createRequestMatcher } from "./requestMatching";
import { scoreVolunteer } from "./scoring";

const viewer = scenarios[0]!.volunteers.find((v) => v.id === scenarios[0]!.expectedTiers[0]![0])!;
const entries = [scenarios[0]!, scenarios[5]!].map((s) => ({
  id: s.id,
  target: s.target,
  scored: scoreVolunteer(viewer, s.target)!,
}));
const answer = {
  content: [
    {
      type: "tool_use",
      name: "submit_ranking",
      input: {
        ranking: [
          { candidate: "c2", reason: "Nearby help fits the profile." },
          { candidate: "c1", reason: "Grocery skills fit." },
        ],
      },
    },
  ],
} as unknown as Message;

beforeEach(() => {
  vi.spyOn(logger, "info").mockImplementation(() => undefined);
  vi.spyOn(logger, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("opportunity feed resilience", () => {
  it("logs one outcome line per load without feed or volunteer data", async () => {
    const send = vi.fn().mockResolvedValue(answer);
    const match = createRequestMatcher({ send, modelId: () => "mock" });
    await match(viewer, entries);
    await match(viewer, entries);
    expect(logger.info).toHaveBeenNthCalledWith(
      1,
      "Opportunity re-rank",
      expect.objectContaining({ items: 2, rankedBy: "ai", cache: "miss", orderChanged: true }),
    );
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      "Opportunity re-rank",
      expect.objectContaining({ cache: "hit" }),
    );
    expect(JSON.stringify(vi.mocked(logger.info).mock.calls)).not.toContain(viewer.name);
  });

  it("logs the failure kind and keeps the rule order when Claude fails", async () => {
    const send = vi.fn().mockRejectedValue(new TypeError("secret detail"));
    const result = await createRequestMatcher({ send, modelId: () => "mock" })(viewer, entries);
    expect(result.map((r) => r.id)).toEqual(entries.map((e) => e.id));
    expect(logger.warn).toHaveBeenCalledWith("Opportunity re-rank failed, using rules", {
      error: "TypeError",
    });
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain("secret detail");
  });

  it("gives up before the browser's 8 s GET timeout even when the configured timeout is longer", async () => {
    vi.useFakeTimers();
    vi.stubEnv("MATCHING_AI_TIMEOUT_MS", "9000");
    const send = vi.fn().mockReturnValue(new Promise(() => undefined));
    const pending = createRequestMatcher({ send, modelId: () => "mock" })(viewer, entries);
    await vi.advanceTimersByTimeAsync(4001);
    const result = await pending;
    expect(result.every((r) => r.rankedBy === "rules")).toBe(true);
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
});
