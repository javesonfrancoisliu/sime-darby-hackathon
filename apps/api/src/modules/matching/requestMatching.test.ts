import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { describe, expect, it, vi } from "vitest";
import { scenarios } from "../../../scripts/matching-benchmark/dataset";
import { scoreVolunteer } from "./scoring";
import { buildRequestRankingPrompt, createRequestMatcher } from "./requestMatching";

const scenario = scenarios[0]!;
const viewer = scenario.volunteers.find((v) => v.id === scenario.expectedTiers[0]![0])!;
const entriesFor = (user = viewer) =>
  [scenarios[0]!, scenarios[5]!, scenarios[10]!].map((s) => ({
    id: s.id,
    target: s.target,
    scored: scoreVolunteer(user, s.target)!,
  }));
const message = (ranking: unknown) =>
  ({
    content: [{ type: "tool_use", name: "submit_ranking", input: { ranking } }],
  }) as unknown as Message;

describe("requests ranked for the authenticated volunteer", () => {
  it("uses request labels and one anonymous volunteer profile without names, IDs or coordinates", () => {
    const prompt = JSON.stringify(buildRequestRankingPrompt("mock", viewer, entriesFor()));
    for (const secret of [
      viewer.id,
      viewer.name,
      String(viewer.location.lat),
      ...entriesFor().map((e) => e.id),
    ])
      expect(prompt).not.toContain(secret);
    expect(prompt).toContain("volunteer");
    expect(prompt).toContain("opportunities");
    expect(prompt).toContain("availabilityConfirmed");
    expect(prompt).toContain("second person");
    expect(prompt).toContain("110-170");
    expect(prompt).toContain("maximum of 240");
  });
  it("gives requests and volunteer drives the same Claude, validation and provenance handling", async () => {
    const entries = entriesFor()
      .slice(0, 2)
      .map((entry, index) => ({
        ...entry,
        kind: index === 0 ? ("event" as const) : ("request" as const),
      }));
    const prompt = buildRequestRankingPrompt("mock", viewer, entries);
    const payload = JSON.parse(prompt.messages[0]!.content as string);
    expect(payload.opportunities.map((entry: { kind: string }) => entry.kind)).toEqual([
      "event",
      "request",
    ]);
    const send = vi.fn().mockResolvedValue(
      message([
        { candidate: "c2", reason: "Nearby help fits the profile." },
        { candidate: "c1", reason: "A certified doctor." },
      ]),
    );
    const result = await createRequestMatcher({ send, modelId: () => "mock" })(viewer, entries);
    expect(result.map((entry) => entry.id)).toEqual([entries[1]!.id, entries[0]!.id]);
    expect(result[0]).toMatchObject({ rankedBy: "ai", explanationSource: "ai" });
    expect(result[1]).toMatchObject({ rankedBy: "ai", explanationSource: "rules" });
    expect(result[1]!.reason).not.toContain("doctor");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("reranks requests, keeps scores external to AI and coalesces calls separately per viewer", async () => {
    const send = vi.fn().mockResolvedValue(
      message([
        { candidate: "c2", reason: "Relevant phone experience." },
        { candidate: "c1", reason: "Grocery skills fit." },
        { candidate: "c3", reason: "Nearby." },
      ]),
    );
    const match = createRequestMatcher({ send, modelId: () => "mock" });
    const [a, b] = await Promise.all([match(viewer, entriesFor()), match(viewer, entriesFor())]);
    expect(a.map((r) => r.id)).toEqual(["scenario-06", "scenario-01", "scenario-11"]);
    expect(a).toEqual(b);
    expect(a.every((r) => r.rankedBy === "ai")).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const other = {
      ...viewer,
      id: "22222222-2222-4222-8222-222222222222",
      skills: ["digital_literacy" as const],
    };
    await match(other, entriesFor(other));
    expect(send).toHaveBeenCalledTimes(2);
    await match({ ...viewer, experience: "New experience" }, entriesFor());
    expect(send).toHaveBeenCalledTimes(3);
    await match(viewer, entriesFor().slice(1));
    expect(send).toHaveBeenCalledTimes(4);
  });
  it.each([[], [{ candidate: "c99", reason: "Unknown" }], "malformed"])(
    "returns rules for unusable ranking %j",
    async (ranking) => {
      const match = createRequestMatcher({
        send: vi.fn().mockResolvedValue(message(ranking)),
        modelId: () => "mock",
      });
      expect((await match(viewer, entriesFor())).every((r) => r.rankedBy === "rules")).toBe(true);
    },
  );
  it("retains known IDs once, repairs unsupported reasons and appends omitted requests", async () => {
    const match = createRequestMatcher({
      modelId: () => "mock",
      send: vi.fn().mockResolvedValue(
        message([
          { candidate: "c2", reason: "A certified doctor." },
          { candidate: "c2", reason: "Duplicate" },
        ]),
      ),
    });
    const result = await match(viewer, entriesFor());
    expect(result).toHaveLength(3);
    expect(new Set(result.map((r) => r.id)).size).toBe(3);
    expect(result[0]?.reason).not.toContain("doctor");
    expect(result[0]).toMatchObject({ rankedBy: "ai", explanationSource: "rules" });
    expect(result.slice(1).every((entry) => entry.explanationSource === "rules")).toBe(true);
  });
  it("times out without retry and retries only after a later fallback cache expiry", async () => {
    let now = 0;
    const send = vi.fn(() => new Promise<Message>(() => {}));
    const match = createRequestMatcher({
      send,
      modelId: () => "mock",
      timeoutMs: 5,
      now: () => now,
    });
    expect((await match(viewer, entriesFor()))[0]?.rankedBy).toBe("rules");
    await match(viewer, entriesFor());
    expect(send).toHaveBeenCalledTimes(1);
    now = 10_001;
    await match(viewer, entriesFor());
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("does not invoke the provider when disabled, empty or credentials fail", async () => {
    const send = vi.fn().mockRejectedValue(new Error("missing credentials"));
    await createRequestMatcher({ send, modelId: () => "" })(viewer, entriesFor());
    expect(send).not.toHaveBeenCalled();
    await createRequestMatcher({ send, modelId: () => "mock" })(viewer, []);
    expect(send).not.toHaveBeenCalled();
    expect(
      (await createRequestMatcher({ send, modelId: () => "mock" })(viewer, entriesFor()))[0]
        ?.rankedBy,
    ).toBe("rules");
  });
});
