import type { Challenge, Quiz, Reward } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call, createVolunteerInState } from "../../test/api";
import { createCoordinator, createElder } from "../../test/people";
import { useTestTable } from "../../test/table";
import { getUser } from "../users/repository";
import { createChallengeVia } from "./testSupport";

useTestTable();

describe("rejected volunteers are blocked from earning actions", () => {
  let coordinatorId: string;
  let rejectedId: string;
  let pendingId: string;
  let challenge: Challenge;
  let quiz: Quiz;
  let reward: Reward;

  beforeAll(async () => {
    coordinatorId = (await createCoordinator()).id;
    rejectedId = (await createVolunteerInState("rejected")).id;
    pendingId = (await createVolunteerInState("pending")).id;
    challenge = await createChallengeVia(coordinatorId);
    const quizRes = await call("POST", "/api/quizzes", {
      as: coordinatorId,
      body: {
        title: "Gate quiz",
        questions: [{ question: "Q1?", options: ["a", "b", "c", "d"], correctIndex: 1 }],
        passMark: 1,
      },
    });
    quiz = quizRes.body as Quiz;
    const rewardRes = await call("POST", "/api/rewards", {
      as: coordinatorId,
      body: { title: "Gate reward", pointsCost: 1, icon: "gift", category: "shop" },
    });
    reward = rewardRes.body as Reward;
  });

  const actions = (): [string, string, string, unknown?][] => [
    ["POST", "/api/me/check-in", "check-in"],
    ["POST", `/api/challenges/${challenge.id}/join`, "challenge join"],
    ["PUT", `/api/challenges/${challenge.id}/progress`, "challenge progress", { current: 1 }],
    ["POST", `/api/challenges/${challenge.id}/complete`, "challenge complete"],
    ["POST", `/api/challenges/${challenge.id}/contribute`, "challenge contribute"],
    [
      "POST",
      `/api/quizzes/${quiz.id}/submit`,
      "quiz submit",
      { answers: [{ questionId: "q1", optionIndex: 1 }] },
    ],
    ["POST", `/api/rewards/${reward.id}/redeem`, "reward redeem"],
    ["POST", `/api/rewards/${reward.id}/use`, "reward use"],
  ];

  it("returns 403 FORBIDDEN on every earning and reward action", async () => {
    for (const [method, path, label, body] of actions()) {
      const res = await call(method, path, { as: rejectedId, body });
      expect(res.status, label).toBe(403);
      expect(res.body, label).toMatchObject({ error: { code: "FORBIDDEN" } });
    }
  });

  it("writes nothing for a rejected volunteer", async () => {
    const user = await getUser(rejectedId);
    expect(user?.points).toBe(0);
    const mine = await call("GET", "/api/challenges", { as: rejectedId });
    const found = (mine.body as { challenges: Challenge[] }).challenges.find(
      (c) => c.id === challenge.id,
    );
    expect(found).toBeDefined();
    expect(found).not.toHaveProperty("progress");
  });

  it("still lets elders and pending volunteers through the guard", async () => {
    const elder = await createElder();
    for (const as of [elder.id, pendingId]) {
      expect((await call("POST", "/api/me/check-in", { as })).status).toBe(200);
      expect((await call("POST", `/api/challenges/${challenge.id}/join`, { as })).status).toBe(200);
    }
  });
});
