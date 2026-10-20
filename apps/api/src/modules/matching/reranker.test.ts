import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type { User } from "@sdh/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../lib/logger";
import { createClaudeReranker, isSafeReason, type SendMessage } from "./claudeReranker";
import { buildMessageRequest, buildPromptPayload, RANKING_TOOL_NAME } from "./prompt";
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
  points: 0,
  lifetimePoints: 0,
  interests: [],
  languages: [],
  leaderboardOptIn: false,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
});

const candidates = rankVolunteers(target, [1, 2, 3, 4].map(make));
const ruleOrder = candidates.map((c) => c.volunteer.id);

const toolOutput = (input: unknown): Message =>
  ({
    content: [{ type: "tool_use", id: "t1", name: RANKING_TOOL_NAME, input }],
    stop_reason: "tool_use",
  }) as unknown as Message;

const rerankerWith = (send: SendMessage, timeoutMs = 1000) =>
  createClaudeReranker({ send, modelId: "test-model", timeoutMs });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("claude reranker", () => {
  it.each([{ ranking: [] }, { ranking: [{ candidate: "unknown", reason: "Nearby" }] }, "not JSON"])(
    "uses rules for unusable output %j",
    async (input) => {
      vi.spyOn(logger, "warn").mockImplementation(() => undefined);
      const result = await rerankerWith(
        vi.fn<SendMessage>().mockResolvedValue(toolOutput(input)),
      ).rerank(target, candidates);
      expect(result).toEqual(await rulesReranker.rerank(target, candidates));
    },
  );

  it.each(["Certified nurse available then", "Available at the requested time"])(
    "replaces unsupported claims: %s",
    async (reason) => {
      const result = await rerankerWith(
        vi
          .fn<SendMessage>()
          .mockResolvedValue(toolOutput({ ranking: [{ candidate: "c1", reason }] })),
      ).rerank(target, candidates);
      expect(result.items[0]?.reason).toBe(
        (await rulesReranker.rerank(target, candidates)).items[0]?.reason,
      );
    },
  );
  it("reorders with AI reasons and reports ai", async () => {
    const send = vi.fn<SendMessage>().mockResolvedValue(
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
    expect(send.mock.calls[0]?.[0].model).toBe("test-model");
  });

  it("drops unknown and repeated labels", async () => {
    const send = vi.fn<SendMessage>().mockResolvedValue(
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
      .fn<SendMessage>()
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
    const send = vi.fn<SendMessage>().mockResolvedValue(
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

  it("replaces an unshortenable reason with bounded factual evidence", async () => {
    const send = vi
      .fn<SendMessage>()
      .mockResolvedValue(toolOutput({ ranking: [{ candidate: "c1", reason: "x".repeat(500) }] }));
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.items[0]?.reason.length).toBeLessThanOrEqual(240);
    expect(result.items[0]?.reason).toBe(
      (await rulesReranker.rerank(target, candidates)).items[0]?.reason,
    );
  });

  it("falls back to rules on malformed tool output", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const send = vi.fn<SendMessage>().mockResolvedValue(toolOutput({ ranking: "nope" }));
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result).toEqual(await rulesReranker.rerank(target, candidates));
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to rules when the model returns no tool call", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const send = vi
      .fn<SendMessage>()
      .mockResolvedValue({ content: [{ type: "text", text: "no tool" }] } as never);
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.rankedBy).toBe("rules");
  });

  it("falls back to rules when send rejects, without logging candidate data", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const send = vi.fn<SendMessage>().mockRejectedValue(new Error("Secret Name 1 boom"));
    const result = await rerankerWith(send).rerank(target, candidates);
    expect(result.rankedBy).toBe("rules");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Secret Name");
  });

  it("falls back to rules within the timeout when send never resolves", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    let aborted = false;
    const send: SendMessage = (_input, signal) =>
      new Promise(() => signal.addEventListener("abort", () => (aborted = true)));
    const started = Date.now();
    const result = await rerankerWith(send, 50).rerank(target, candidates);
    expect(result.rankedBy).toBe("rules");
    expect(Date.now() - started).toBeLessThan(1000);
    expect(aborted).toBe(true);
  });
});

describe("prompt privacy", () => {
  it("redacts common contact details embedded in free text", () => {
    const payload = JSON.stringify(
      buildPromptPayload(
        {
          ...target,
          description:
            "Call +60 12-345 6789 or a@example.com at https://example.com, 3.12345, 101.54321",
        },
        candidates,
      ),
    );
    for (const privateText of [
      "12-345",
      "a@example.com",
      "https://example.com",
      "3.12345",
      "101.54321",
    ])
      expect(payload).not.toContain(privateText);
    expect(payload).toContain("[contact removed]");
  });
  it("sends no names, ids or coordinates", () => {
    const request = JSON.stringify(buildMessageRequest("test-model", target, candidates));
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
    const request = buildMessageRequest("test-model", target, candidates);
    expect(request.tool_choice).toEqual({ type: "tool", name: RANKING_TOOL_NAME });
    expect(request.tools).toHaveLength(1);
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
