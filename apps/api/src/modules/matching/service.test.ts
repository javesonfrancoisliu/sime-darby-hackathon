import { HelpRequest, User } from "@sdh/contracts";
import { describe, expect, it, vi } from "vitest";
import { createMatchingService } from "./service";
import { rulesReranker } from "./reranker";

const request = HelpRequest.parse({
  id: "00000000-0000-4000-8000-000000000001",
  elderId: "00000000-0000-4000-8000-000000000002",
  elderName: "Resident",
  category: "groceries",
  title: "Shopping",
  description: "Heavy bags",
  scheduledAt: "2027-01-02T02:00:00Z",
  durationMinutes: 60,
  location: { lat: 3.1, lng: 101.5, area: "Elmina" },
  status: "open",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
});
const volunteer = User.parse({
  id: "00000000-0000-4000-8000-000000000003",
  role: "volunteer",
  name: "Helper",
  area: "Elmina",
  location: request.location,
  skills: ["groceries"],
  experience: "Carries shopping bags",
  availability: [],
  verification: "verified",
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
});

describe("matching service", () => {
  it("coalesces concurrent calls and caches rankings, but invalidates changed evidence and eligibility", async () => {
    let now = 0;
    const rerank = vi.fn(async (...args: Parameters<typeof rulesReranker.rerank>) => ({
      ...(await rulesReranker.rerank(...args)),
      rankedBy: "ai" as const,
    }));
    const match = createMatchingService({
      reranker: () => ({ rerank }),
      modelId: () => "mock-model",
      now: () => now,
    });
    const responses = await Promise.all([match(request, [volunteer]), match(request, [volunteer])]);
    expect(responses[0]).toEqual(responses[1]);
    expect(responses[0]?.rankedBy).toBe("ai");
    expect(rerank).toHaveBeenCalledTimes(1);
    await match(request, [volunteer]);
    expect(rerank).toHaveBeenCalledTimes(1);
    await match({ ...request, description: "Different needs" }, [volunteer]);
    await match(request, [{ ...volunteer, experience: "New evidence" }]);
    expect(rerank).toHaveBeenCalledTimes(3);
    expect((await match(request, [{ ...volunteer, verification: "pending" }])).matches).toEqual([]);
    expect(rerank).toHaveBeenCalledTimes(3);
    now = 60_001;
    await match(request, [volunteer]);
    expect(rerank).toHaveBeenCalledTimes(4);
  });

  it("briefly caches failures and retries after ten seconds", async () => {
    let now = 0;
    const rerank = vi.fn().mockRejectedValue(new Error("credentials unavailable"));
    const match = createMatchingService({
      reranker: () => ({ rerank }),
      modelId: () => "mock-model",
      now: () => now,
    });
    expect((await match(request, [volunteer])).rankedBy).toBe("rules");
    await match(request, [volunteer]);
    expect(rerank).toHaveBeenCalledTimes(1);
    now = 10_001;
    await match(request, [volunteer]);
    expect(rerank).toHaveBeenCalledTimes(2);
  });

  it("does not invoke AI with no model or no eligible volunteers", async () => {
    const rerank = vi.fn();
    const disabled = createMatchingService({ reranker: () => ({ rerank }), modelId: () => "" });
    expect((await disabled(request, [volunteer])).matches).toHaveLength(1);
    const enabled = createMatchingService({ reranker: () => ({ rerank }), modelId: () => "mock" });
    expect((await enabled(request, [])).matches).toEqual([]);
    expect(rerank).not.toHaveBeenCalled();
  });

  it("falls back when a provider adapter returns only invalid candidate IDs", async () => {
    const rerank = vi.fn().mockResolvedValue({
      rankedBy: "ai",
      items: [{ volunteerId: "unknown", reason: "Invalid" }],
    });
    const match = createMatchingService({ reranker: () => ({ rerank }), modelId: () => "mock" });
    const result = await match(request, [volunteer]);
    expect(result.rankedBy).toBe("rules");
    expect(result.matches[0]?.volunteerId).toBe(volunteer.id);
  });
});
