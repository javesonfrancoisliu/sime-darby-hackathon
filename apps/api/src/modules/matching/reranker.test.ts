import type { ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import type { User } from "@sdh/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../lib/logger";
import { createBedrockReranker, isSafeReason, type SendConverse } from "./bedrockReranker";
import { buildConverseRequest, buildPromptPayload, RANKING_TOOL_NAME } from "./prompt";
import { rulesReranker, selectReranker, toMatches } from "./reranker";
import { rankVolunteers, type MatchTarget } from "./scoring";
import { RESULT_SIZE } from "./weights";

const ORIGIN = { lat: 3.1234, lng: 101.5678 };
const target: MatchTarget = {
  category: "groceries",
  title: "Weekly shopping",
  description: "Need help carrying shopping",
  scheduledAt: "2026-10-17T01:30:00Z",
  durationMinutes: 60,
  location: ORIGIN,
};

const make = (n: number): User => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  name: `Secret Name ${n}`,
  area: "Precinct 3",
  location: { lat: ORIGIN.lat + n * 0.001, lng: ORIGIN.lng },
  skills: n % 2 ? ["groceries"] : [],
  experience: "Helps neighbours",
  availability: [],
  role: "volunteer",
  verification: "verified",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
});

const candidates = rankVolunteers(target, [1, 2, 3, 4].map(make));
const ruleOrder = candidates.map((c) => c.volunteer.id);

const toolOutput = (input: unknown): ConverseCommandOutput =>
  ({
    output: {
      message: {
        role: "assistant",
        content: [{ toolUse: { toolUseId: "t1", name: RANKING_TOOL_NAME, input } }],
      },
    },
  }) as ConverseCommandOutput;

const rerankerWith = (send: SendConverse, timeoutMs = 1000) =>
  createBedrockReranker({ send, modelId: "test-model", timeoutMs });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("bedrock reranker", () => {
  it("reorders with AI reasons and reports ai", async () => {
    const send = vi.fn<SendConverse>().mockResolvedValue(
      toolOutput({
        ranking: [
          { candidate: "c3", reason: "Lives close by." },
          { candidate: "c1", reason: "Knows shopping." },
          { candidate: "c2", reason: "Free then." },
          { candidate: "c4", reason: "Happy to help." },
        ],
      }),
    );
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.rankedBy).toBe("ai");
    expect(result.items.map((i) => i.volunteerId)).toEqual([
      ruleOrder[2],
      ruleOrder[0],
      ruleOrder[1],
      ruleOrder[3],
    ]);
    expect(result.items[0]?.reason).toBe("Lives close by.");
    expect(send.mock.calls[0]?.[0].modelId).toBe("test-model");
  });

  it("drops unknown and repeated labels", async () => {
    const send = vi.fn<SendConverse>().mockResolvedValue(
      toolOutput({
        ranking: [
          { candidate: "c9", reason: "Ghost" },
          { candidate: "c2", reason: "Two" },
          { candidate: "c2", reason: "Two again" },
          { candidate: "c1", reason: "One" },
          { candidate: "c3", reason: "Three" },
          { candidate: "c4", reason: "Four" },
        ],
      }),
    );
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.items.map((i) => i.volunteerId)).toEqual([
      ruleOrder[1],
      ruleOrder[0],
      ruleOrder[2],
      ruleOrder[3],
    ]);
  });

  it("appends missing candidates in rules order with rule reasons", async () => {
    const send = vi
      .fn<SendConverse>()
      .mockResolvedValue(toolOutput({ ranking: [{ candidate: "c3", reason: "Best" }] }));
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.rankedBy).toBe("ai");
    expect(result.items.map((i) => i.volunteerId)).toEqual([
      ruleOrder[2],
      ruleOrder[0],
      ruleOrder[1],
      ruleOrder[3],
    ]);
    const rules = await rulesReranker.rerank(target, candidates);
    expect(result.items[1]?.reason).toBe(rules.items[0]?.reason);
  });

  it("replaces reasons carrying contact details or links with the rule reason", async () => {
    const send = vi.fn<SendConverse>().mockResolvedValue(
      toolOutput({
        ranking: [
          { candidate: "c1", reason: "Call me on 012-345 6789 first" },
          { candidate: "c2", reason: "Lives close by and enjoys shopping" },
        ],
      }),
    );
    const result = await rerankerWith(send).rerank(target, candidates);
    const rules = await rulesReranker.rerank(target, candidates);
    expect(result.items[0]?.reason).toBe(rules.items[0]?.reason);
    expect(result.items[1]?.reason).toBe("Lives close by and enjoys shopping");
  });

  it("flags links, emails and phone-like numbers as unsafe", () => {
    for (const unsafe of [
      "Visit https://example.com",
      "see www.example.com",
      "email me a@b.co",
      "Whatsapp 0123456789",
      "Text 012.345.6789",
      "Pay at help-aina.example/pay",
      "Join t.me/helpers",
      "",
    ]) {
      expect(isSafeReason(unsafe)).toBe(false);
    }
    expect(isSafeReason("About 1.5 km away and free on Saturday")).toBe(true);
  });

  it("truncates long reasons to 140 characters", async () => {
    const send = vi
      .fn<SendConverse>()
      .mockResolvedValue(toolOutput({ ranking: [{ candidate: "c1", reason: "x".repeat(500) }] }));
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.items[0]?.reason).toHaveLength(140);
  });

  it("falls back to rules on malformed tool output", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const send = vi.fn<SendConverse>().mockResolvedValue(toolOutput({ ranking: "nope" }));
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result).toEqual(await rulesReranker.rerank(target, candidates));
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to rules when the model returns no tool call", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const send = vi.fn<SendConverse>().mockResolvedValue({ output: undefined } as never);
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.rankedBy).toBe("rules");
  });

  it("falls back to rules when send rejects, without logging candidate data", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const send = vi.fn<SendConverse>().mockRejectedValue(new Error("Secret Name 1 boom"));
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.rankedBy).toBe("rules");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Secret Name");
  });

  it("falls back to rules within the timeout when send never resolves", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    let aborted = false;
    const send: SendConverse = (_input, signal) =>
      new Promise(() => signal.addEventListener("abort", () => (aborted = true)));
    const started = Date.now();
    const result = await rerankerWith(send, 50).rerank(target, candidates);
    expect(result.rankedBy).toBe("rules");
    expect(Date.now() - started).toBeLessThan(1000);
    expect(aborted).toBe(true);
  });
});

describe("prompt privacy", () => {
  it("sends no names, ids or coordinates", () => {
    const request = JSON.stringify(buildConverseRequest("test-model", target, candidates));
    for (const entry of candidates) {
      expect(request).not.toContain(entry.volunteer.name);
      expect(request).not.toContain(entry.volunteer.id);
      expect(request).not.toContain(String(entry.volunteer.location.lat));
    }
    expect(request).not.toContain(String(ORIGIN.lat));
    expect(request).not.toContain(String(ORIGIN.lng));
    expect(request).not.toContain("Precinct 3");
    expect(JSON.stringify(buildPromptPayload(target, candidates))).toContain('"label":"c1"');
  });

  it("forces the single ranking tool", () => {
    const request = buildConverseRequest("test-model", target, candidates);
    expect(request.toolConfig?.toolChoice).toEqual({ tool: { name: RANKING_TOOL_NAME } });
    expect(request.toolConfig?.tools).toHaveLength(1);
  });
});

describe("selectReranker", () => {
  it("returns the rules reranker when no model id is set", () => {
    vi.stubEnv("MATCHING_AI_MODEL_ID", "");
    expect(selectReranker()).toBe(rulesReranker);
  });

  it("returns a different reranker when a model id is set", () => {
    vi.stubEnv("MATCHING_AI_MODEL_ID", "some-model");
    expect(selectReranker()).not.toBe(rulesReranker);
  });
});

describe("toMatches", () => {
  it("builds matches limited to the result size", async () => {
    const many = rankVolunteers(target, [1, 2, 3, 4, 5, 6, 7].map(make));
    const matches = toMatches(await rulesReranker.rerank(target, many), many);
    expect(matches).toHaveLength(RESULT_SIZE);
    expect(matches[0]).toMatchObject({
      volunteerId: many[0]?.volunteer.id,
      name: many[0]?.volunteer.name,
      score: many[0]?.score,
    });
  });
});
