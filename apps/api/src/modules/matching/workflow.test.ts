import type { HelpRequest, MatchesResponse } from "@sdh/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setAnthropicKeyHooksForTests } from "../../lib/anthropicKey";
import { logger } from "../../lib/logger";
import { call, createUser, createVerifiedVolunteer, createVolunteerInState } from "../../test/api";
import { useTestTable } from "../../test/table";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: send };
  },
}));

useTestTable();
afterEach(() => {
  setAnthropicKeyHooksForTests(null);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  send.mockReset();
});

async function submit() {
  const coordinator = await createUser("coordinator");
  const elder = await createUser("elder");
  const volunteer = await createVerifiedVolunteer(coordinator.id, {
    skills: ["groceries"],
    experience: "I carry heavy grocery bags for neighbours",
    availability: [{ day: "sat", start: "09:00", end: "12:00" }],
  });
  await createVolunteerInState("pending", { skills: ["groceries"] });
  const response = await call("POST", "/api/requests", {
    as: elder.id,
    body: {
      title: "Groceries",
      description: "Carrying heavy bags is difficult",
      category: "groceries",
      location: { ...elder.location, area: elder.area },
      scheduledAt: "2027-01-02T02:00:00Z",
      durationMinutes: 60,
    },
  });
  expect(response.status).toBe(201);
  return { request: response.body as HelpRequest, elder, volunteer };
}

describe("submission to hybrid recommendations (mocked provider)", () => {
  it("does not start a late inference after secure key retrieval times out", async () => {
    const { request, elder } = await submit();
    vi.stubEnv("MATCHING_AI_MODEL_ID", "mock-slow-key-model");
    vi.stubEnv("ANTHROPIC_API_KEY_PARAM", "/test/slow-key");
    vi.stubEnv("MATCHING_AI_TIMEOUT_MS", "10");
    let finishKey!: (value: string) => void;
    setAnthropicKeyHooksForTests({
      fetcher: () =>
        new Promise<string>((resolve) => {
          finishKey = resolve;
        }),
    });
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const response = await call("GET", `/api/requests/${request.id}/matches`, { as: elder.id });
    expect((response.body as MatchesResponse).rankedBy).toBe("rules");
    finishKey("mock-delayed-key");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(send).not.toHaveBeenCalled();
  });

  it("retrieves the key through the existing abstraction, validates Claude output and preserves self-accept", async () => {
    const { request, elder, volunteer } = await submit();
    vi.stubEnv("MATCHING_AI_MODEL_ID", "mock-model");
    vi.stubEnv("ANTHROPIC_API_KEY_PARAM", "/test/mock-key");
    const fetcher = vi.fn().mockResolvedValue("mock-key-not-a-real-credential");
    setAnthropicKeyHooksForTests({ fetcher });
    send.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "submit_ranking",
          input: {
            ranking: [
              {
                candidate: "c1",
                reason:
                  "Grocery experience includes carrying heavy bags; available at your requested time.",
              },
            ],
          },
        },
      ],
    });
    const matches = await call("GET", `/api/requests/${request.id}/matches`, { as: elder.id });
    expect(matches.status).toBe(200);
    const result = matches.body as MatchesResponse;
    expect(result.rankedBy).toBe("ai");
    expect(result.matches.find((m) => m.volunteerId === volunteer.id)?.score).toBe(97);
    expect(fetcher).toHaveBeenCalledWith("/test/mock-key");
    expect(send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(send.mock.calls[0]![0].messages[0].content);
    expect(payload.request.description).toContain("heavy bags");
    expect(
      payload.candidates.every(
        (c: { availableAtRequestedTime: boolean }) => c.availableAtRequestedTime,
      ),
    ).toBe(true);
    expect(JSON.stringify(payload)).not.toContain(volunteer.id);
    await call("GET", `/api/requests/${request.id}/matches`, { as: elder.id });
    expect(send).toHaveBeenCalledTimes(1);
    const accepted = await call("POST", `/api/requests/${request.id}/accept`, { as: volunteer.id });
    expect(accepted.status).toBe(200);
    expect(
      (await call("GET", `/api/requests/${request.id}/matches`, { as: elder.id })).status,
    ).toBe(409);
  });

  it("returns usable rules results when secure key retrieval fails", async () => {
    const { request, elder } = await submit();
    vi.stubEnv("MATCHING_AI_MODEL_ID", "mock-unavailable-model");
    vi.stubEnv("ANTHROPIC_API_KEY_PARAM", "/test/unavailable-key");
    setAnthropicKeyHooksForTests({
      fetcher: async () => {
        throw new Error("mock missing credentials");
      },
    });
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const response = await call("GET", `/api/requests/${request.id}/matches`, { as: elder.id });
    expect(response.status).toBe(200);
    expect((response.body as MatchesResponse).rankedBy).toBe("rules");
    expect((response.body as MatchesResponse).matches.length).toBeGreaterThan(0);
    expect(send).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain("credentials");
  });
});
