import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scenarios } from "../../../scripts/matching-benchmark/dataset";
import { logger } from "../../lib/logger";
import { useTestTable } from "../../test/table";
import { createMemoryAnswerStore, dynamoAnswerStore, type StoredAnswer } from "./answerStore";
import { createRequestMatcher } from "./requestMatching";
import { scoreVolunteer } from "./scoring";

useTestTable();

const viewer = scenarios[0]!.volunteers.find((v) => v.id === scenarios[0]!.expectedTiers[0]![0])!;
const entryFor = (index: number, user = viewer) => ({
  id: scenarios[index]!.id,
  target: scenarios[index]!.target,
  scored: scoreVolunteer(user, scenarios[index]!.target)!,
});
const three = () => [entryFor(0), entryFor(5), entryFor(10)];

const tool = (ranking: unknown) =>
  ({
    content: [{ type: "tool_use", name: "submit_ranking", input: { ranking } }],
  }) as unknown as Message;
const rank = (...rows: [string, number][]) =>
  tool(
    rows.map(([candidate, fit]) => ({ candidate, reason: "Nearby help fits the profile.", fit })),
  );

const labelsIn = (call: unknown) =>
  (
    JSON.parse((call as [{ messages: { content: string }[] }])[0].messages[0]!.content)
      .opportunities as { label: string }[]
  ).length;

beforeEach(() => {
  vi.spyOn(logger, "info").mockImplementation(() => undefined);
  vi.spyOn(logger, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("saved Claude answers", () => {
  it("asks once, then reuses the saved answers from a fresh matcher without calling Claude", async () => {
    const store = createMemoryAnswerStore();
    const send = vi.fn().mockResolvedValue(rank(["c3", 90], ["c1", 70], ["c2", 50]));
    const first = await createRequestMatcher({ store, send, modelId: () => "mock" })(
      viewer,
      three(),
    );
    // A new matcher stands in for another Lambda container: only the store remembers.
    const second = await createRequestMatcher({ store, send, modelId: () => "mock" })(
      viewer,
      three(),
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(store.size()).toBe(3);
    expect(second).toEqual(first);
    expect(first.every((r) => r.rankedBy === "ai")).toBe(true);
  });

  it("orders by the saved fit, so the order does not move between loads", async () => {
    const store = createMemoryAnswerStore();
    const send = vi.fn().mockResolvedValue(rank(["c1", 20], ["c2", 95], ["c3", 60]));
    const entries = three();
    const result = await createRequestMatcher({ store, send, modelId: () => "mock" })(
      viewer,
      entries,
    );
    expect(result.map((r) => r.id)).toEqual([entries[1]!.id, entries[2]!.id, entries[0]!.id]);
    const again = await createRequestMatcher({ store, send, modelId: () => "mock" })(
      viewer,
      entries,
    );
    expect(again.map((r) => r.id)).toEqual(result.map((r) => r.id));
  });

  it("asks only about an opportunity that has no saved answer", async () => {
    const store = createMemoryAnswerStore();
    const send = vi
      .fn()
      .mockResolvedValueOnce(rank(["c1", 80], ["c2", 70]))
      .mockResolvedValueOnce(rank(["c1", 90]));
    const match = () => createRequestMatcher({ store, send, modelId: () => "mock" });
    await match()(viewer, [entryFor(0), entryFor(5)]);
    await match()(viewer, three());
    expect(send).toHaveBeenCalledTimes(2);
    expect(labelsIn(send.mock.calls[1])).toBe(1);
    expect(store.size()).toBe(3);
  });

  it("asks about at most five at a time and finishes the rest on the next loads", async () => {
    const store = createMemoryAnswerStore();
    const many = Array.from({ length: 12 }, (_, i) => entryFor(i));
    const send = vi.fn().mockImplementation(async (request: unknown) => {
      const count = labelsIn([request]);
      return rank(
        ...Array.from({ length: count }, (_, i): [string, number] => [`c${i + 1}`, 80 - i]),
      );
    });
    const match = () => createRequestMatcher({ store, send, modelId: () => "mock" });
    await match()(viewer, many);
    expect(labelsIn(send.mock.calls[0])).toBe(5);
    await match()(viewer, many);
    await match()(viewer, many);
    expect(send).toHaveBeenCalledTimes(3);
    expect(store.size()).toBe(12);
    await match()(viewer, many);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("asks again when the volunteer changes skills or experience", async () => {
    const store = createMemoryAnswerStore();
    const send = vi.fn().mockResolvedValue(rank(["c1", 80], ["c2", 70], ["c3", 60]));
    await createRequestMatcher({ store, send, modelId: () => "mock" })(viewer, three());
    const changed = { ...viewer, experience: `${viewer.experience} Also drives a car.` };
    await createRequestMatcher({ store, send, modelId: () => "mock" })(changed, three());
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("asks again about an opportunity whose text changed, and only that one", async () => {
    const store = createMemoryAnswerStore();
    const send = vi.fn().mockResolvedValue(rank(["c1", 80], ["c2", 70], ["c3", 60]));
    const entries = three();
    await createRequestMatcher({ store, send, modelId: () => "mock" })(viewer, entries);
    const edited = [
      entries[0]!,
      { ...entries[1]!, target: { ...entries[1]!.target, description: "Different." } },
      entries[2]!,
    ];
    send.mockResolvedValueOnce(rank(["c1", 55]));
    await createRequestMatcher({ store, send, modelId: () => "mock" })(viewer, edited);
    expect(send).toHaveBeenCalledTimes(2);
    expect(labelsIn(send.mock.calls[1])).toBe(1);
  });

  it("keeps the rule order for what Claude failed on, saves nothing, and tries again later", async () => {
    const store = createMemoryAnswerStore();
    let now = 0;
    const send = vi.fn().mockRejectedValue(new Error("down"));
    const match = createRequestMatcher({ store, send, modelId: () => "mock", now: () => now });
    const entries = three();
    const result = await match(viewer, entries);
    expect(result.every((r) => r.rankedBy === "rules")).toBe(true);
    await match(viewer, entries);
    expect(send).toHaveBeenCalledTimes(1);
    expect(store.size()).toBe(0);
    now = 60_001;
    await match(viewer, entries);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("still answers when the saved answers cannot be read or written", async () => {
    const broken = {
      list: vi.fn().mockRejectedValue(new Error("no table")),
      save: vi.fn().mockRejectedValue(new Error("no table")),
    };
    const send = vi.fn().mockResolvedValue(rank(["c1", 80], ["c2", 70], ["c3", 60]));
    const result = await createRequestMatcher({ store: broken, send, modelId: () => "mock" })(
      viewer,
      three(),
    );
    expect(result.every((r) => r.rankedBy === "ai")).toBe(true);
  });
});

describe("saved answers in DynamoDB", () => {
  const answer = (over: Partial<StoredAnswer> = {}): StoredAnswer => ({
    inputHash: "h1",
    reason: "First answer.",
    explanationSource: "ai",
    fit: 80,
    model: "mock",
    createdAt: "2026-10-21T00:00:00.000Z",
    ...over,
  });

  it("stores and lists an answer per volunteer", async () => {
    await dynamoAnswerStore.save("vol-a", "request:1", answer());
    await dynamoAnswerStore.save("vol-b", "request:1", answer({ reason: "Other person." }));
    const mine = await dynamoAnswerStore.list("vol-a");
    expect([...mine.keys()]).toEqual(["request:1"]);
    expect(mine.get("request:1")).toEqual(answer());
  });

  it("never overwrites an answer made from the same inputs, but replaces one made from old inputs", async () => {
    await dynamoAnswerStore.save("vol-c", "request:2", answer());
    await dynamoAnswerStore.save("vol-c", "request:2", answer({ reason: "Second try.", fit: 10 }));
    expect((await dynamoAnswerStore.list("vol-c")).get("request:2")?.reason).toBe("First answer.");
    await dynamoAnswerStore.save(
      "vol-c",
      "request:2",
      answer({ inputHash: "h2", reason: "New inputs." }),
    );
    expect((await dynamoAnswerStore.list("vol-c")).get("request:2")?.reason).toBe("New inputs.");
  });
});
