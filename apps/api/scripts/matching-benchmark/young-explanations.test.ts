// Offline replay of genuine saved Claude outputs; the transport is always injected.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type { Category, OpportunitiesResponse, User } from "@sdh/contracts";
import { describe, expect, it, vi } from "vitest";
import { scenarios } from "./dataset";
import { CATEGORY_LABELS } from "../../src/modules/matching/weights";
import {
  createRequestMatcher,
  type RequestCandidate,
} from "../../src/modules/matching/requestMatching";
import { prepareExplanation } from "../../src/modules/matching/explanations";

const read = (path: string) =>
  JSON.parse(
    readFileSync(
      resolve(process.cwd(), "scripts/matching-benchmark/results", path),
      "utf8",
    ).replace(/^\uFEFF/, ""),
  );
const baseline = read("young-e2e-2026-10-20/baseline-feed.json") as OpportunitiesResponse;
const viewer = {
  ...scenarios[0]!.volunteers[0]!,
  ...read("young-e2e-2026-10-20/profile-evidence.json"),
} as User;
const captures = [
  ["young-e2e-2026-10-20", "production-input", "raw-response"],
  ["young-ui-2026-10-20-2", "input", "response"],
  ["young-ui-2026-10-20-3", "input", "response"],
] as const;

describe("saved Young-role Claude explanations, no network", () => {
  it("preserves both explanations from the latest controlled test without inference", () => {
    const raw = read("young-justification-240-2026-10-20/response.json");
    const ranking = raw.content[0].input.ranking as { reason: string }[];
    for (const item of ranking) {
      expect(
        prepareExplanation(item.reason, {
          volunteer: viewer,
          score: 47,
          distanceKm: 0.5,
          components: { skill: 0, proximity: 0.9, availability: 1 },
          reasons: ["About 0.5 km away"],
        }),
      ).toEqual({ reason: item.reason, treatment: "unchanged" });
    }
  });
  it.each(captures)(
    "preserves ranking/scores and labels explanation provenance for %s",
    async (folder, inputName, responseName) => {
      const input = read(`${folder}/${inputName}.json`);
      const raw = read(`${folder}/${responseName}.json`);
      const payload = JSON.parse(input.messages[0].content) as {
        requests: {
          title: string;
          category: string;
          description: string;
          scheduledAt: string;
          durationMinutes: number;
          distanceKm: number;
          availabilityConfirmed: boolean;
          ruleScore: number;
        }[];
      };
      const entries: RequestCandidate[] = payload.requests.map((request) => {
        const original = baseline.items.find(
          (item) => item.kind === "request" && item.request.title === request.title,
        )!;
        if (original.kind !== "request") throw new Error("Missing saved request evidence");
        const category = (Object.keys(CATEGORY_LABELS) as Category[]).find(
          (key) => CATEGORY_LABELS[key] === request.category,
        )!;
        return {
          id: original.request.id,
          // Location isn't used by explanation handling; distances/scores below are saved API evidence.
          target: { ...request, category, location: viewer.location },
          scored: {
            volunteer: viewer,
            score: request.ruleScore,
            distanceKm: request.distanceKm,
            components: {
              skill: viewer.skills.includes(category) ? 1 : 0,
              proximity: Math.max(0, 1 - request.distanceKm / 5),
              availability: request.availabilityConfirmed ? 1 : 0,
            },
            reasons: original.reasons,
          },
        };
      });
      const send = vi.fn().mockResolvedValue(raw as Message);
      const result = await createRequestMatcher({ modelId: () => "offline-only", send })(
        viewer,
        entries,
      );
      const ranking = raw.content[0].input.ranking as { candidate: string; reason: string }[];
      expect(result.map((item) => item.id)).toEqual(
        ranking.map((item) => entries[Number(item.candidate.slice(1)) - 1]!.id),
      );
      for (const item of result) {
        expect(item.rankedBy).toBe("ai");
        expect(item.reason.length).toBeLessThanOrEqual(240);
        expect(item.explanationSource).toBe("ai");
      }
      expect(entries.map((entry) => entry.scored.score)).toEqual(
        payload.requests.map((request) => request.ruleScore),
      );
      expect(send).toHaveBeenCalledTimes(1); // injected saved transport, never a real API call
      if (folder.endsWith("-3")) {
        expect(ranking.map((item) => item.reason.length)).toEqual([154, 143]);
        expect(result.map((item) => item.reason.length)).toEqual([154, 143]);
        expect(result[0]!.reason).toContain("phone and errand help experience");
        expect(result[0]!.reason).toContain("digital help skills");
        expect(result[0]!.reason).toContain("confirmed availability");
        expect(result[1]!.reason).toContain("do not cover home repairs or ladder work");
        expect(result[1]!.reason).toContain("does not mention bulb changes");
        expect(
          result.map(
            (item) =>
              prepareExplanation(item.reason, entries.find((entry) => entry.id === item.id)!.scored)
                .treatment,
          ),
        ).toEqual(["unchanged", "unchanged"]);
      }
    },
  );
});
